import http.server
import socketserver
import json
from .models import active_sessions, create_lobby, join_lobby, leave_lobby, add_chat_message

PORT = 8000
DIRECTORY = "Files"

class LobbyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            if self.path == "/api/lobby/create":
                response = create_lobby(
                    player_name=data['playerName'],
                    password=data.get('password'),
                    avatar_index=data['avatarIndex'],
                    max_players=data.get('maxPlayers', 8),
                    client_ip=self.client_address[0]
                )
                self.send_json_response(response)
                
            elif self.path == "/api/lobby/join":
                response = join_lobby(
                    room_code=data['roomCode'],
                    player_name=data['playerName'],
                    password=data.get('password'),
                    avatar_index=data['avatarIndex'],
                    client_ip=self.client_address[0]
                )
                self.send_json_response(response)
                
            else:
                self.send_error(404, "Route non trouvée")
                
        except Exception as e:
            self.send_json_response({'success': False, 'error': str(e)}, 400)

    def do_GET(self):
        try:
            if self.path == '/api/lobbies':
                response_data = {
                    'lobbies': [session.to_dict() for session in active_sessions.values()]
                }
                self.send_json_response(response_data)
            elif self.path.startswith('/api/lobby/'):
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
        try:
            if self.path.startswith('/api/lobby/delete/'):
                room_code = self.path.split('/')[-1]
                
                if room_code in active_sessions:
                    # Vérification du propriétaire
                    data = json.loads(self.rfile.read(int(self.headers['Content-Length'])).decode())
                    if active_sessions[room_code].owner == data.get('userId'):
                        del active_sessions[room_code]
                        self.send_json_response({'success': True})
                    else:
                        self.send_error_response("Action non autorisée", 403)
                else:
                    self.send_error_response("Salon non trouvé", 404)
            else:
                self.send_error_response("Endpoint non trouvé", 404)
        except Exception as e:
            self.send_error_response(str(e), 500)

def run_server():
    with socketserver.TCPServer(("", PORT), LobbyHandler) as httpd:
        print(f"Serveur lancé sur le port {PORT}")
        httpd.serve_forever()