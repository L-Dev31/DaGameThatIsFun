import random
import string
import time
from typing import Dict, Optional
from System.models import LobbySession, User, ChatMessage

active_sessions: Dict[str, LobbySession] = {}

def generate_code() -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        if code not in active_sessions:
            return code

def create_lobby(player_name: str, password: Optional[str], avatar_index: int, max_players: int, client_ip: str) -> dict:
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

def join_lobby(room_code: str, player_name: str, password: Optional[str], avatar_index: int, client_ip: str) -> dict:
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

def leave_lobby(room_code: str, user_id: str) -> dict:
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

def add_chat_message(room_code: str, user_id: str, content: str) -> dict:
    if not room_code or not user_id or not content:
        raise ValueError("Informations manquantes pour le message")
        
    if room_code not in active_sessions:
        raise ValueError("Le salon n'existe pas")
        
    lobby = active_sessions[room_code]
    
    if user_id not in lobby.users:
        raise ValueError("Utilisateur non trouvé dans le salon")
        
    message = ChatMessage(
        user_id=user_id,
        username=lobby.users[user_id].name,
        content=content,
        timestamp=time.time()
    )
    
    lobby.chat_messages.append(message)
    
    return {
        'success': True,
        'message': {
            'user_id': message.user_id,
            'username': message.username,
            'content': message.content,
            'timestamp': message.timestamp
        }
    }