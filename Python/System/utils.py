import time
from typing import Dict
from System.models import LobbySession

def cleanup_inactive_lobbies(active_sessions: Dict[str, LobbySession]):
    while True:
        current_time = time.time()
        to_remove = []
        
        for code, lobby in active_sessions.items():
            if current_time - lobby.created_at > 7200:  # 2 heures en secondes
                to_remove.append(code)
                
        for code in to_remove:
            del active_sessions[code]
            
        time.sleep(300)  