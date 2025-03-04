from dataclasses import dataclass, field
from typing import Dict, Optional
import threading

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
    state: str = "waiting"
    lock: threading.Lock = field(default_factory=threading.Lock)
    
    def to_dict(self):
        with self.lock:
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
                'state': self.state  
            }
