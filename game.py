import http.server
import socketserver
import threading
import json
import random
import string
import time
import os
import webbrowser
from dataclasses import dataclass
from typing import Dict, Optional, List

PORT = 8000
DIRECTORY = "Files"

@dataclass
class ChatMessage:
    user_id: str
    username: str
    content: str
    timestamp: float

@dataclass
class User:
    id: str
    name: str
    avatar_index: int
    join_time: float
    ip_address: str

@dataclass
class LobbySession:
    code: str
    name: str
    owner: str
    password: Optional[str]
    users: Dict[str, User]
    created_at: float
    max_players: int
    chat_messages: List[ChatMessage]
    
    def to_dict(self):
        return {
            'code': self.code,
            'name': self.name,
            'owner': self.owner,
            'hasPassword': bool(self.password),
            'users': {uid: {
                'id': u.id,
                'name': u.name,
                'avatar_index': u.avatar_index,
                'join_time': u.join_time,
                'ip_address': u.ip_address
            } for uid, u in self.users.items()},
            'created_at': self.created_at,
            'max_players': self.max_players,
            'chat_messages': [{
                'user_id': msg.user_id,
                'username': msg.username,
                'content': msg.content,
                'timestamp': msg.timestamp
            } for msg in self.chat_messages]
        }

active_sessions: Dict[str, LobbySession] = {}

def generate_code() -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        if code not in active_sessions:
            return code

class LobbyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, message, status=400):
        self.send_json_response({'error': message, 'success': False}, status)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        response = {}

        try:
            data = json.loads(post_data.decode('utf-8'))
            if self.path == "/create_lobby":
                response = create_lobby(
                    player_name=data['player_name'],
                    password=data.get('password'),
                    avatar_index=data['avatar_index'],
                    max_players=data['max_players'],
                    client_ip=self.client_address[0]
                )
            elif self.path == "/join_lobby":
                response = join_lobby(
                    room_code=data['room_code'],
                    player_name=data['player_name'],
                    password=data.get('password'),
                    avatar_index=data['avatar_index'],
                    client_ip=self.client_address[0]
                )
            elif self.path == "/leave_lobby":
                response = leave_lobby(
                    room_code=data['room_code'],
                    user_id=data['user_id']
                )
            elif self.path == "/add_chat_message":
                response = add_chat_message(
                    room_code=data['room_code'],
                    user_id=data['user_id'],
                    username=data['username'],
                    content=data['content']
                )
            else:
                self.send_error(404, "Route non trouvée")
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode('utf-8'))

        except ValueError as e:
            self.send_error(400, f"Erreur de validation : {e}")
        except KeyError as e:
            self.send_error(400, f"Champ manquant : {e}")
        except Exception as e:
            self.send_error(500, f"Erreur interne du serveur : {e}")

    def do_GET(self):
        try:
            if self.path == '/api/lobbies':
                response_data = {
                    'lobbies': [session.to_dict() for session in active_sessions.values()]
                }
                self.send_json_response(response_data)
                
            elif self.path.startswith('/api/lobby/') and len(self.path.split('/')) == 4:
                room_code = self.path.split('/')[-1]
                if room_code in active_sessions:
                    self.send_json_response(active_sessions[room_code].to_dict())
                else:
                    self.send_error_response("Salon non trouvé", 404)
                    
            else:
                super().do_GET()
                
        except Exception as e:
            self.send_error_response(str(e))

    def do_DELETE(self):
        if self.path.startswith('/api/lobby/delete/'):
            room_code = self.path.split('/')[-1]
            
            if room_code in active_sessions:
                del active_sessions[room_code]
                self.send_json_response({'success': True})
            else:
                self.send_error_response("Le salon n'existe pas", 404)
        else:
            self.send_error_response("Endpoint non trouvé", 404)

    def create_lobby(self, data, client_ip):
        player_name = data.get('playerName')
        password = data.get('password')
        avatar_index = data.get('avatarIndex', 0)
        max_players = data.get('maxPlayers', 8)
        
        if not player_name:
            raise ValueError("Le nom du joueur est requis")
        
        if max_players not in range(2, 9):
            raise ValueError("Le nombre de joueurs doit être entre 2 et 8")
        
        room_code = generate_code()
        user_id = str(random.randint(10000, 99999))
        
        owner = User(
            id=user_id,
            name=player_name,
            avatar_index=avatar_index,
            join_time=time.time(),
            ip_address=client_ip
        )
        
        lobby_session = LobbySession(
            code=room_code,
            name=f"Salon de {player_name}",
            owner=user_id,
            password=password,
            users={user_id: owner},
            created_at=time.time(),
            max_players=max_players,
            chat_messages=[]
        )
        
        active_sessions[room_code] = lobby_session
        
        return {
            'success': True,
            'roomCode': room_code,
            'userId': user_id,
            'sessionData': lobby_session.to_dict()
        }

    def join_lobby(self, data, client_ip):
        room_code = data.get('roomCode')
        player_name = data.get('playerName')
        password = data.get('password')
        avatar_index = data.get('avatarIndex', 0)
        
        if not room_code or not player_name:
            raise ValueError("Le code du salon et le nom du joueur sont requis")
            
        if room_code not in active_sessions:
            raise ValueError("Le salon n'existe pas")
            
        lobby = active_sessions[room_code]
        
        if lobby.password and lobby.password != password:
            raise ValueError("Mot de passe incorrect")
            
        if len(lobby.users) >= lobby.max_players:
            raise ValueError("Le salon est plein")
            
        user_id = str(random.randint(10000, 99999))
        new_user = User(
            id=user_id,
            name=player_name,
            avatar_index=avatar_index,
            join_time=time.time(),
            ip_address=client_ip
        )
        
        lobby.users[user_id] = new_user
        
        return {
            'success': True,
            'userId': user_id,
            'sessionData': lobby.to_dict()
        }

    def leave_lobby(self, room_code, user_id):
        if not room_code or not user_id:
            raise ValueError("Le code du salon et l'ID utilisateur sont requis")
            
        if room_code not in active_sessions:
            raise ValueError("Le salon n'existe pas")
            
        lobby = active_sessions[room_code]
        
        if user_id not in lobby.users:
            raise ValueError("Utilisateur non trouvé dans le salon")
            
        # Si c'est le propriétaire qui part, supprimer le salon
        if user_id == lobby.owner:
            del active_sessions[room_code]
        else:
            del lobby.users[user_id]
            
        return {'success': True}

def cleanup_inactive_lobbies():
    while True:
        current_time = time.time()
        to_remove = []
        
        for code, lobby in active_sessions.items():
            # Supprimer les lobbys inactifs depuis plus de 2 heures
            if current_time - lobby.created_at > 7200:  # 2 heures en secondes
                to_remove.append(code)
                
        for code in to_remove:
            del active_sessions[code]
            
        time.sleep(300)  # Vérifier toutes les 5 minutes

def run_server():
    with socketserver.TCPServer(("", PORT), LobbyHandler) as httpd:
        print(f"Serveur lancé sur le port {PORT}")
        print(f"Accédez à http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    # Créer le dossier des fichiers statiques s'il n'existe pas
    os.makedirs(DIRECTORY, exist_ok=True)

    # Démarrer le nettoyage automatique des lobbys inactifs
    cleanup_thread = threading.Thread(target=cleanup_inactive_lobbies, daemon=True)
    cleanup_thread.start()

    # Démarrer le serveur
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()

    # Ouvrir le navigateur
    webbrowser.open(f"http://localhost:{PORT}")

    print("Serveur de jeu démarré. Appuyez sur Ctrl+C pour arrêter.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nArrêt du serveur...")