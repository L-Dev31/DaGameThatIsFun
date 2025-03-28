# Architecture Générale de DaGameThatIsFun

## Vue d'ensemble

DaGameThatIsFun est une plateforme de jeux multijoueurs locaux conçue avec une architecture client-serveur. Le jeu permet à plusieurs joueurs de se connecter via leurs appareils (smartphones, tablettes, ordinateurs) à une session de jeu hébergée localement sur un ordinateur hôte.

L'architecture du jeu est divisée en deux parties principales :

1. **Backend (Python)** : Gère le serveur HTTP, la logique des lobbies, la communication entre les joueurs et la persistance des données de session.
2. **Frontend (JavaScript/HTML/CSS)** : Fournit l'interface utilisateur, gère les interactions des joueurs et communique avec le backend via des API REST.

## Structure du Projet

```
DaGameThatIsFun/
├── Files/                      # Fichiers statiques et frontend
│   ├── Games/                  # Jeux spécifiques
│   │   ├── general/            # Composants partagés entre les jeux
│   │   ├── loading/            # Écran de chargement
│   │   └── quiz-rush/          # Jeu Quiz Rush
│   ├── Javascript/             # Scripts JavaScript principaux
│   ├── static/                 # Ressources statiques (images, musique, etc.)
│   ├── *.html                  # Pages HTML principales
├── Python/                     # Backend Python
│   ├── System/                 # Modules du système
│   │   ├── __pycache__/        # Fichiers compilés Python
│   │   ├── lobby.py            # Gestion des lobbies
│   │   ├── models.py           # Modèles de données
│   │   ├── qr.py               # Génération de QR code
│   │   ├── server.py           # Serveur HTTP
│   │   └── utils.py            # Utilitaires
│   └── app.py                  # Point d'entrée principal
├── Launcher.bat                # Script de lancement pour Windows
└── requirements.txt            # Dépendances Python
```

## Flux de Données et Communication

Le flux de données dans DaGameThatIsFun suit un modèle client-serveur classique avec des particularités pour le jeu en temps réel :

1. **Initialisation** :
   - Le script `app.py` démarre le serveur HTTP sur le port 8080
   - Le serveur expose les fichiers statiques et les API REST
   - Le navigateur de l'hôte s'ouvre automatiquement sur la page d'accueil

2. **Création et Gestion des Lobbies** :
   - Les joueurs peuvent créer ou rejoindre des lobbies via l'interface
   - Le backend gère les sessions de lobby avec des codes uniques
   - Les données des lobbies sont stockées en mémoire

3. **Communication en Temps Réel** :
   - Le frontend utilise un système de polling pour obtenir les mises à jour
   - Les commandes sont envoyées au serveur puis propagées aux autres joueurs
   - Le système de notification permet la communication entre les joueurs

4. **Gestion des Jeux** :
   - L'hôte du lobby peut lancer différents jeux
   - Tous les joueurs sont redirigés vers le jeu sélectionné
   - Chaque jeu a sa propre logique et interface

## Mécanismes de Sécurité et Stabilité

1. **Gestion des Sessions** :
   - Identifiants uniques pour les lobbies et les joueurs
   - Protection par mot de passe optionnelle pour les lobbies

2. **Nettoyage Automatique** :
   - Suppression des lobbies inactifs après 2 heures
   - Détection et gestion des joueurs déconnectés

3. **Gestion des Erreurs** :
   - Système de backoff exponentiel pour les requêtes de polling
   - Gestion des erreurs de connexion et des timeouts

4. **Partage de Session** :
   - Génération de QR codes pour faciliter la connexion des joueurs
   - Détection automatique de l'adresse IP locale

## Technologies Utilisées

- **Backend** : Python 3, HTTP Server, Threading
- **Frontend** : JavaScript (ES6+), HTML5, CSS3
- **Communication** : API REST, JSON
- **Ressources** : Images PNG, Sons MP3

Cette architecture permet une expérience de jeu fluide et réactive tout en minimisant les dépendances externes, ce qui facilite le déploiement et l'utilisation dans un environnement local.
