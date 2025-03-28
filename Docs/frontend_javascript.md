# Documentation du Frontend (JavaScript)

## Vue d'ensemble

Le frontend de DaGameThatIsFun est développé en JavaScript moderne (ES6+) et constitue l'interface utilisateur du jeu. Il gère l'affichage, les interactions utilisateur, la communication avec le backend et l'expérience de jeu. Cette partie du système est conçue pour être réactive, intuitive et visuellement attrayante.

## Structure des fichiers

```
Files/
├── Games/                      # Jeux spécifiques
│   ├── general/                # Composants partagés entre les jeux
│   │   ├── credits.js          # Système de crédits
│   │   └── players.js          # Gestion des joueurs
│   ├── loading/                # Écran de chargement
│   │   └── script.js           # Script de l'écran de chargement
│   └── quiz-rush/              # Jeu Quiz Rush
│       └── script.js           # Script du jeu Quiz Rush
├── Javascript/                 # Scripts JavaScript principaux
│   ├── avatar.js               # Gestion des avatars
│   ├── button_controls.js      # Contrôles des boutons
│   ├── create_lobby.js         # Création de lobby
│   ├── credits.js              # Page de crédits
│   ├── index.js                # Script principal
│   ├── join_lobby.js           # Rejoindre un lobby
│   ├── lobby_commands.js       # Commandes de lobby
│   ├── lobby_manager.js        # Gestionnaire de lobby
│   └── waiting_room.js         # Salle d'attente
└── *.html                      # Pages HTML principales
```

## Modules principaux

### index.js

Le script principal qui initialise l'application et gère la page d'accueil.

**Fonctionnalités clés :**
- Initialisation du gestionnaire de lobby
- Gestion de l'écran d'introduction
- Contrôle du son et de la musique
- Configuration et affichage des jeux disponibles
- Gestion des boutons de navigation

**Points techniques importants :**
- Utilise des événements personnalisés pour la communication entre composants
- Implémente un système de prévisualisation des jeux avec effets de transition
- Gère l'état de la session utilisateur via localStorage

### lobby_manager.js

Gère la communication avec le backend et la synchronisation des données de lobby.

**Fonctionnalités clés :**
- Initialisation et configuration du polling
- Récupération et mise à jour des données de lobby
- Envoi de commandes aux autres joueurs
- Gestion des erreurs de connexion

**Points techniques importants :**
- Implémente un système de polling avec backoff exponentiel
- Utilise un mécanisme de déduplication des commandes
- Gère la persistance des sessions via localStorage
- Implémente des mécanismes de récupération après erreur

### lobby_commands.js

Définit les commandes disponibles pour la communication entre joueurs.

**Fonctionnalités clés :**
- Commandes de redirection
- Commandes de démarrage de jeu
- Commandes de mise à jour d'état

**Structure :**
- Objet `lobbyCommands` contenant des fonctions pour chaque type de commande
- Chaque fonction prend en paramètre un payload et le gestionnaire de lobby

### create_lobby.js et join_lobby.js

Gèrent respectivement la création et la connexion à un lobby.

**Fonctionnalités clés :**
- Validation des formulaires
- Communication avec les API du backend
- Gestion des erreurs et feedback utilisateur
- Redirection vers la salle d'attente

### waiting_room.js

Gère la salle d'attente où les joueurs se rassemblent avant de commencer un jeu.

**Fonctionnalités clés :**
- Affichage et mise à jour de la liste des joueurs
- Gestion des droits du propriétaire du lobby
- Contrôles pour démarrer le jeu
- Affichage du code QR pour inviter d'autres joueurs

### Games/quiz-rush/script.js

Implémente la logique spécifique du jeu Quiz Rush.

**Fonctionnalités clés :**
- Chargement et affichage des questions
- Gestion des réponses des joueurs
- Calcul des scores
- Affichage des résultats

## Flux de données et communication

1. **Initialisation de l'interface :**
   - `index.js` initialise le gestionnaire de lobby et l'interface utilisateur
   - Les événements DOM sont configurés pour les interactions utilisateur

2. **Gestion des lobbies :**
   - `create_lobby.js` ou `join_lobby.js` communiquent avec le backend
   - Les informations de session sont stockées dans localStorage
   - `lobby_manager.js` commence à interroger le serveur pour les mises à jour

3. **Communication en temps réel :**
   - `lobby_manager.js` envoie et reçoit des commandes via le backend
   - Les commandes sont traitées par les fonctions dans `lobby_commands.js`
   - Les mises à jour de l'interface sont déclenchées par des événements personnalisés

4. **Expérience de jeu :**
   - Les joueurs sont redirigés vers le jeu sélectionné
   - Le script spécifique au jeu (ex: `quiz-rush/script.js`) gère la logique du jeu
   - Les résultats et actions sont synchronisés via le système de commandes

## Gestion de l'état et persistance

1. **localStorage :**
   - `roomCode` : Code du lobby actuel
   - `userId` : Identifiant unique du joueur
   - `introSeen` : État de l'écran d'introduction

2. **sessionStorage :**
   - `currentPage` : Page actuelle pour optimiser le polling

3. **État en mémoire :**
   - `LobbyManager._processedCommandIds` : Ensemble des commandes déjà traitées
   - `LobbyManager._lastProcessedCommand` : Dernière commande traitée

## Optimisations et performances

1. **Polling intelligent :**
   - Backoff exponentiel en cas d'erreur
   - Intervalles adaptés selon la page active
   - Limitation du nombre de requêtes sur les pages critiques

2. **Gestion du cache :**
   - Prévention du cache pour les requêtes API
   - Utilisation du cache pour les ressources statiques

3. **Déduplication des commandes :**
   - Identifiants uniques pour chaque commande
   - Suivi des commandes déjà traitées

4. **Gestion des erreurs :**
   - Récupération automatique après erreurs temporaires
   - Feedback utilisateur en cas d'erreur critique

## Compatibilité et accessibilité

1. **Compatibilité navigateur :**
   - Utilisation de JavaScript moderne avec compatibilité large
   - Gestion des différences entre navigateurs pour les fonctionnalités audio

2. **Responsive design :**
   - Interface adaptative pour différentes tailles d'écran
   - Optimisé pour les appareils mobiles et de bureau

3. **Feedback utilisateur :**
   - Effets visuels et sonores pour les actions
   - Messages d'erreur clairs et informatifs

## Dépendances externes

Le frontend a des dépendances minimales pour optimiser les performances :

- Aucune bibliothèque JavaScript externe majeure (pas de jQuery, React, etc.)
- Utilisation de JavaScript natif (Vanilla JS)
- Quelques polyfills pour la compatibilité navigateur

Cette approche légère permet un chargement rapide et une expérience fluide sur tous les appareils.
