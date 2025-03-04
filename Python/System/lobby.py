import random
import string
import time
import threading
from typing import Dict, Optional
from System.models import LobbySession, User

active_sessions: Dict[str, LobbySession] = {}
active_sessions_lock = threading.Lock()

def generate_code() -> str:
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        with active_sessions_lock:
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
        max_players=max_players
    )

    with active_sessions_lock:
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

    with active_sessions_lock:
        if room_code not in active_sessions:
            raise ValueError("Le salon n'existe pas")
        lobby = active_sessions[room_code]

    with lobby.lock:
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

def leave_lobby(user_id: str, room_code: str):
    if room_code not in active_sessions:
        return
    
    lobby = active_sessions[room_code]

    if user_id in lobby.users:
        del lobby.users[user_id]

    if not lobby.users:
        print(f"Le lobby {room_code} est vide et sera supprimé.")
        del active_sessions[room_code]
    elif user_id == lobby.owner:
        # Si l'owner quitte mais qu'il reste des joueurs, transférer l'ownership
        new_owner = next(iter(lobby.users))
        lobby.owner = new_owner
        print(f"L'owner du lobby {room_code} a changé : {new_owner}")
