import random
import string
import time
import threading
from typing import Dict, Optional
from System.models import LobbySession, User

active_sessions: Dict[str, LobbySession] = {}
active_sessions_lock = threading.Lock()
INACTIVITY_THRESHOLD = 90
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
    return {'success': True, 'roomCode': room_code, 'userId': user_id, 'sessionData': lobby_session.to_dict()}
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
    return {'success': True, 'userId': user_id, 'sessionData': lobby.to_dict()}
def leave_lobby(user_id: str, room_code: str) -> dict:
    if room_code not in active_sessions:
        return {'success': False, 'error': "Le salon n'existe pas"}
    lobby = active_sessions[room_code]
    if user_id in lobby.users:
        del lobby.users[user_id]
    if user_id == lobby.owner:
        print(f"L'owner du lobby {room_code} a quitté, suppression du lobby.")
        del active_sessions[room_code]
    elif not lobby.users:
        print(f"Le lobby {room_code} est vide et sera supprimé.")
        del active_sessions[room_code]
    return {'success': True}
def cleanup_inactive_users():
    while True:
        time.sleep(10)
        current_time = time.time()
        with active_sessions_lock:
            for room_code in list(active_sessions.keys()):
                lobby = active_sessions[room_code]
                with lobby.lock:
                    inactive_users = []
                    for user_id, user in lobby.users.items():
                        if current_time - user.last_seen > INACTIVITY_THRESHOLD:
                            inactive_users.append(user_id)
                    for user_id in inactive_users:
                        del lobby.users[user_id]
                        print(f"[CLEANUP] Utilisateur {user_id} retiré du salon {room_code} pour inactivité.")
                    if lobby.owner in inactive_users:
                        print(f"[CLEANUP] Propriétaire {lobby.owner} inactif, suppression du salon {room_code}.")
                        del active_sessions[room_code]
                    elif not lobby.users:
                        print(f"[CLEANUP] Salon {room_code} vide, suppression.")
                        del active_sessions[room_code]
cleanup_thread = threading.Thread(target=cleanup_inactive_users, daemon=True)
cleanup_thread.start()