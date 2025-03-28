# models.py
from dataclasses import dataclass, field
from typing import Dict, Optional
import threading, time

@dataclass
class User:
    """
    Représente un utilisateur dans un lobby.
    """
    id: str  # Identifiant unique de l'utilisateur
    name: str  # Nom de l'utilisateur
    avatar_index: int  # Index de l'avatar choisi 
    join_time: float  # Timestamp de l'heure de connexion au lobby
    ip_address: str  # Adresse IP de l'utilisateur
    last_seen: float = field(default_factory=lambda: time.time())  # Dernière activité de l'utilisateur (par défaut: moment actuel)

@dataclass
class LobbySession:
    """
    Représente une session de lobby multijoueur
    """
    code: str  # Code unique du lobby
    name: str  # Nom du lobby
    owner: str  # Identifiant de l'utilisateur propriétaire du lobby
    password: Optional[str]  # Mot de passe optionnel du lobby
    users: Dict[str, User]  # Dictionnaire des utilisateurs connectés 
    created_at: float  # Timestamp de la création du lobby
    max_players: int  # Nombre maximal de joueurs autorisés
    state: str = "waiting"  # État actuel du lobby 
    lock: threading.Lock = field(default_factory=threading.Lock)  # Verrou pour gérer les accès concurrent
    
    def to_dict(self):
        """
        Convertit l'objet LobbySession en un dictionnaire.
        """
        with self.lock:
            return {
                'code': self.code,
                'name': self.name,
                'owner': self.owner,
                'hasPassword': bool(self.password),  #Indique si un mot de passe est défini
                'users': {uid: {
                    'id': u.id,
                    'name': u.name,
                    'avatar_index': u.avatar_index,
                    'join_time': u.join_time,
                    'ip_address': u.ip_address,
                    'last_seen': u.last_seen
                } for uid, u in self.users.items()},  #conversion des objets user en dictionnaire
                'created_at': self.created_at,
                'max_players': self.max_players,
                'state': self.state  # État actuel du lobby
            }
