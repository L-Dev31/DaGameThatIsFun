# Documentation du Backend (Python)

## Vue d'ensemble

Le backend de DaGameThatIsFun est développé en Python et constitue le cœur du système. Il gère le serveur HTTP, les sessions de jeu, la communication entre les joueurs et la persistance des données. Cette partie du système est conçue pour être légère, efficace et facile à déployer sur un ordinateur hôte.

## Structure des fichiers

```
Python/
├── System/                 # Modules du système
│   ├── lobby.py            # Gestion des lobbies
│   ├── models.py           # Modèles de données
│   ├── qr.py               # Génération de QR code
│   ├── server.py           # Serveur HTTP
│   └── utils.py            # Utilitaires
└── app.py                  # Point d'entrée principal
```

## Modules principaux

### app.py

Le point d'entrée principal de l'application qui initialise et démarre tous les composants nécessaires.

**Fonctionnalités clés :**
- Définit le répertoire des fichiers statiques
- Initialise le thread de nettoyage des lobbies inactifs
- Démarre le serveur HTTP sur le port 8080
- Ouvre automatiquement le navigateur par défaut
- Gère l'arrêt propre du serveur (via Ctrl+C)

**Dépendances :**
- `os`, `time`, `threading`, `webbrowser` : Bibliothèques standard Python
- `colorama` : Pour l'affichage coloré dans le terminal
- Modules internes : `System.server`, `System.utils`, `System.lobby`

### System/server.py

Implémente le serveur HTTP et gère toutes les requêtes API.

**Fonctionnalités clés :**
- Classe `LobbyHandler` qui étend `http.server.SimpleHTTPRequestHandler`
- Gestion des requêtes HTTP (GET, POST, DELETE, OPTIONS)
- Endpoints API pour :
  - Création et gestion des lobbies
  - Envoi de commandes et notifications
  - Récupération des informations de lobby
  - Génération de QR code pour le partage
- Gestion des erreurs et des connexions interrompues

**Points techniques importants :**
- Utilise un serveur HTTP multithreadé pour gérer plusieurs connexions simultanées
- Implémente des mécanismes de cache pour optimiser les performances
- Gère les erreurs de connexion (réinitialisée, abandonnée, pipe brisé)

### System/lobby.py

Gère la création, la gestion et la suppression des lobbies de jeu.

**Fonctionnalités clés :**
- Génération de codes de lobby uniques
- Création et gestion des sessions de lobby
- Gestion des joueurs (rejoindre/quitter)
- Nettoyage automatique des utilisateurs inactifs

**Structures de données importantes :**
- `active_sessions` : Dictionnaire global des sessions actives
- Verrou `active_sessions_lock` pour la synchronisation des accès concurrents
- Constante `INACTIVITY_THRESHOLD` (90 secondes) pour la détection d'inactivité

### System/models.py

Définit les modèles de données utilisés dans l'application.

**Classes principales :**
- `User` : Représente un utilisateur dans un lobby
  - Attributs : id, name, avatar_index, join_time, ip_address, last_seen
  
- `LobbySession` : Représente une session de lobby multijoueur
  - Attributs : code, name, owner, password, users, created_at, max_players, state
  - Méthodes : to_dict() pour la sérialisation

**Points techniques importants :**
- Utilise des dataclasses Python pour une définition claire et concise
- Intègre des verrous (threading.Lock) pour la gestion des accès concurrents
- Implémente des méthodes de sérialisation pour la communication API

### System/qr.py

Gère la génération de codes QR pour faciliter la connexion des joueurs.

**Fonctionnalités clés :**
- Détection de l'adresse IP locale
- Génération de codes QR encodant l'URL du serveur
- Mise en cache des codes QR générés pour optimiser les performances

**Méthodes principales :**
- `get_local_ip()` : Détecte l'adresse IP locale de l'ordinateur hôte
- `generate_qr_code(ip, port)` : Génère un code QR pour l'URL spécifiée

### System/utils.py

Contient des fonctions utilitaires pour le système.

**Fonctionnalités clés :**
- `cleanup_inactive_lobbies()` : Supprime les lobbies inactifs après 2 heures

## Flux de données et communication

1. **Initialisation du serveur :**
   - `app.py` démarre le thread de nettoyage et le serveur HTTP
   - Le serveur écoute sur le port 8080 et sert les fichiers statiques

2. **Gestion des lobbies :**
   - Les requêtes de création/connexion sont traitées par `server.py`
   - Les données de lobby sont stockées dans `active_sessions` (lobby.py)
   - Les modèles définis dans `models.py` structurent les données

3. **Communication en temps réel :**
   - Les clients effectuent des requêtes de polling pour obtenir les mises à jour
   - Les commandes sont envoyées via POST à `/api/lobby/{code}/command`
   - Les notifications sont gérées via `/api/lobby/{code}/notify`

4. **Nettoyage automatique :**
   - `cleanup_inactive_lobbies()` s'exécute périodiquement
   - Les utilisateurs inactifs sont supprimés après 90 secondes
   - Les lobbies vides ou inactifs sont supprimés

## Sécurité et robustesse

1. **Gestion des accès concurrents :**
   - Utilisation de verrous (threading.Lock) pour protéger les ressources partagées
   - Synchronisation des accès aux lobbies et aux utilisateurs

2. **Gestion des erreurs :**
   - Capture et traitement des exceptions
   - Gestion des erreurs de connexion réseau
   - Réponses d'erreur formatées pour le client

3. **Protection des données :**
   - Les mots de passe des lobbies ne sont jamais exposés aux clients
   - Validation des entrées utilisateur

4. **Nettoyage automatique :**
   - Prévention des fuites de mémoire via le nettoyage périodique
   - Gestion automatique des déconnexions

## Dépendances externes

Le backend a des dépendances minimales pour faciliter le déploiement :

- **Python 3.x** : Langage de programmation
- **colorama** : Pour l'affichage coloré dans le terminal
- **qrcode** : Pour la génération de codes QR
- **ujson** : Pour le traitement JSON optimisé

Ces dépendances sont listées dans le fichier `requirements.txt` à la racine du projet.
