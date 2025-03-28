# Guide d'Installation et de Déploiement

## Prérequis

Avant d'installer et de déployer DaGameThatIsFun, assurez-vous que votre système répond aux exigences suivantes :

### Configuration matérielle recommandée
- **Processeur** : Intel Core i3 ou équivalent (ou supérieur)
- **Mémoire RAM** : 4 Go minimum
- **Espace disque** : 100 Mo d'espace libre
- **Connexion réseau** : Connexion Wi-Fi ou Ethernet pour le jeu multijoueur local

### Logiciels requis
- **Système d'exploitation** : Windows 10/11, macOS 10.14+, ou Linux (Ubuntu 20.04+ recommandé)
- **Python** : Version 3.8 ou supérieure
- **Navigateur web** : Chrome, Firefox, Edge ou Safari (dernières versions)

## Installation

### Étape 1 : Installation de Python

#### Windows
1. Téléchargez Python depuis [python.org](https://www.python.org/downloads/)
2. Lancez l'installateur et cochez l'option "Add Python to PATH"
3. Suivez les instructions d'installation

#### macOS
1. Téléchargez Python depuis [python.org](https://www.python.org/downloads/)
2. Lancez l'installateur et suivez les instructions
3. Vérifiez l'installation en ouvrant Terminal et en tapant `python3 --version`

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install python3 python3-pip
```

### Étape 2 : Téléchargement du jeu

1. Téléchargez l'archive DaGameThatIsFun.rar
2. Extrayez le contenu dans un dossier de votre choix

### Étape 3 : Installation des dépendances

Ouvrez un terminal ou une invite de commande dans le dossier où vous avez extrait le jeu et exécutez :

```bash
pip install -r requirements.txt
```

Cela installera toutes les dépendances nécessaires listées dans le fichier `requirements.txt` :
- colorama
- qrcode
- ujson
- et autres bibliothèques requises

## Lancement du jeu

### Windows
Double-cliquez sur le fichier `Launcher.bat` pour démarrer le jeu.

### macOS et Linux
Ouvrez un terminal dans le dossier du jeu et exécutez :

```bash
python3 Python/app.py
```

Le serveur démarrera et ouvrira automatiquement votre navigateur par défaut à l'adresse `http://localhost:8080`.

## Configuration du réseau

### Partage avec d'autres joueurs

Pour permettre à d'autres joueurs de rejoindre votre partie :

1. Assurez-vous que tous les appareils sont connectés au même réseau Wi-Fi
2. Sur l'écran principal du jeu, cliquez sur le bouton [PARTAGER] en haut à gauche
3. Un QR code et un lien apparaîtront, que les autres joueurs peuvent utiliser pour rejoindre

### Résolution des problèmes de connexion

Si les joueurs ne peuvent pas se connecter :

1. Vérifiez que tous les appareils sont sur le même réseau
2. Assurez-vous que votre pare-feu autorise les connexions sur le port 8080
3. Sur certains réseaux, vous devrez peut-être configurer la redirection de port sur votre routeur

## Structure des lobbies

### Création d'un lobby
1. Cliquez sur "Créer un lobby" sur l'écran principal
2. Entrez votre nom et choisissez un avatar
3. Définissez un mot de passe (optionnel) et le nombre maximum de joueurs
4. Cliquez sur "Créer"

### Rejoindre un lobby
1. Cliquez sur "Rejoindre un lobby" sur l'écran principal
2. Entrez le code à 4 caractères du lobby
3. Entrez votre nom et choisissez un avatar
4. Entrez le mot de passe si nécessaire
5. Cliquez sur "Rejoindre"

## Modes de jeu

### Quiz Rush
- **Joueurs** : 2 à 8
- **Description** : Répondez rapidement à des questions pour marquer des points
- **Fonctionnement** : Le premier à répondre correctement marque le plus de points

### Modes à venir
- **Dessine moi un Désastre** : Dessinez selon un thème et votez pour le meilleur dessin
- **Gribouilles & Embrouilles** : Un joueur dessine, les autres devinent
- **La Quête Légendaire** : Inventez des histoires sur des objets étranges

## Dépannage

### Le serveur ne démarre pas
- Vérifiez que Python est correctement installé et dans le PATH
- Assurez-vous que toutes les dépendances sont installées
- Vérifiez qu'aucun autre service n'utilise déjà le port 8080

### Les joueurs ne peuvent pas se connecter
- Vérifiez que tous les appareils sont sur le même réseau
- Assurez-vous que le pare-feu n'est pas en train de bloquer les connexions
- Essayez de redémarrer le serveur

### Problèmes de performance
- Fermez les applications gourmandes en ressources
- Réduisez le nombre maximum de joueurs
- Assurez-vous que votre réseau Wi-Fi est stable

## Mise à jour

Pour mettre à jour le jeu vers une nouvelle version :

1. Téléchargez la nouvelle version
2. Extrayez-la dans un nouveau dossier
3. Réinstallez les dépendances si nécessaire avec `pip install -r requirements.txt`

## Développement et personnalisation

### Ajout de nouvelles questions pour Quiz Rush
Les questions sont stockées dans des fichiers JSON. Pour ajouter de nouvelles questions :

1. Localisez le fichier de questions dans `Files/Games/quiz-rush/questions.json`
2. Suivez le format existant pour ajouter de nouvelles questions
3. Redémarrez le serveur pour que les changements prennent effet

### Personnalisation de l'interface
Pour modifier l'apparence du jeu :

1. Les fichiers CSS se trouvent dans `Files/static/css/`
2. Les images peuvent être remplacées dans `Files/static/images/`
3. Les sons peuvent être modifiés dans `Files/static/music/`

## Considérations de sécurité

- Le jeu est conçu pour être utilisé sur un réseau local et n'implémente pas de mesures de sécurité avancées
- N'exposez pas le serveur directement sur Internet sans protection supplémentaire
- Les mots de passe des lobbies sont stockés en clair et ne sont pas destinés à une sécurité forte

## Support et contact

Si vous rencontrez des problèmes ou avez des questions, consultez la documentation ou contactez l'équipe de développement.
