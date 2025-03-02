# Classes de "modèles" utilisés par les appels API
from dataclasses import dataclass
from typing import Dict, Optional, List

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
            'max_players': self.max_players
        }