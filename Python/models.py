import random
import string
import time
from dataclasses import dataclass
from typing import Dict, Optional, List

@property
def max_players(self):
    return self._max_players

@max_players.setter
def max_players(self, value):
    if not (2 <= value <= 8):
        raise ValueError("Max players must be between 2 and 8")
    self._max_players = value
    
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

def create_lobby(player_name, password, avatar_index, max_players, client_ip):
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

def join_lobby(room_code, player_name, password, avatar_index, client_ip):
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

def leave_lobby(room_code, user_id):
    if not room_code or not user_id:
        raise ValueError("Le code du salon et l'ID utilisateur sont requis")
        
    if room_code not in active_sessions:
        raise ValueError("Le salon n'existe pas")
        
    lobby = active_sessions[room_code]
    
    if user_id not in lobby.users:
        raise ValueError("Utilisateur non trouvé dans le salon")
        
    if user_id == lobby.owner:
        del active_sessions[room_code]
    else:
        del lobby.users[user_id]
        
    return {'success': True}

def add_chat_message(room_code, user_id, username, content):
    if not room_code or not user_id or not username or not content:
        raise ValueError("Tous les champs sont requis")
        
    if room_code not in active_sessions:
        raise ValueError("Le salon n'existe pas")
        
    lobby = active_sessions[room_code]
    
    if user_id not in lobby.users:
        raise ValueError("Utilisateur non trouvé dans le salon")
        
    message = ChatMessage(
        user_id=user_id,
        username=username,
        content=content,
        timestamp=time.time()
    )
    
    lobby.chat_messages.append(message)
    
    return {'success': True}

def cleanup_inactive_lobbies():
    while True:
        current_time = time.time()
        to_remove = []
        
        for code, lobby in active_sessions.items():
            if current_time - lobby.created_at > 7200:
                to_remove.append(code)
                
        for code in to_remove:
            del active_sessions[code]
            
        time.sleep(300)