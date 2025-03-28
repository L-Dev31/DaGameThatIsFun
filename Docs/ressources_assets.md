# Documentation des Ressources et Assets

## Vue d'ensemble

DaGameThatIsFun utilise diverses ressources statiques pour créer une expérience utilisateur riche et immersive. Ces ressources comprennent des images, des fichiers audio, des icônes et d'autres éléments visuels qui contribuent à l'esthétique et à la fonctionnalité du jeu.

## Structure des dossiers

```
Files/static/
├── images/                     # Images et éléments graphiques
│   ├── avatars/                # Avatars des joueurs
│   ├── devs/                   # Photos des développeurs
│   ├── favicon/                # Icônes de favori
│   ├── llm-icons/              # Icônes des modèles de langage
│   ├── logo/                   # Logos du jeu et des mini-jeux
│   └── preview/                # Images de prévisualisation des jeux
└── music/                      # Fichiers audio et effets sonores
```

## Types de ressources

### Images

#### Avatars
Les avatars sont utilisés pour représenter les joueurs dans les lobbies et les jeux. Ils sont stockés dans le dossier `images/avatars/` et sont référencés par leur index dans le code.

**Caractéristiques techniques :**
- Format : PNG avec transparence
- Dimensions : 128x128 pixels
- Palette de couleurs : RGB

#### Logos et icônes
Les logos et icônes sont utilisés pour l'identité visuelle du jeu et la navigation. Ils sont stockés dans les dossiers `images/logo/`, `images/favicon/` et `images/llm-icons/`.

**Caractéristiques techniques :**
- Format : PNG avec transparence
- Dimensions variables selon l'utilisation
- Versions désactivées pour les jeux non disponibles (suffixe `-disabled`)

#### Images de prévisualisation
Les images de prévisualisation sont affichées sur la page d'accueil pour présenter les différents jeux disponibles. Elles sont stockées dans le dossier `images/preview/`.

**Caractéristiques techniques :**
- Format : PNG
- Dimensions : 1280x720 pixels (16:9)
- Optimisées pour un chargement rapide

### Fichiers audio

#### Musiques de fond
Chaque jeu possède sa propre musique de fond qui contribue à l'ambiance. Ces fichiers sont stockés dans le dossier `music/` et sont nommés d'après le jeu correspondant.

**Caractéristiques techniques :**
- Format : MP3
- Bitrate : 128-192 kbps
- Durée : Variable, conçu pour être joué en boucle
- Volume normalisé pour une expérience cohérente

#### Effets sonores
Des effets sonores sont utilisés pour les interactions et les événements du jeu. Ils sont également stockés dans le dossier `music/`.

**Liste des effets sonores :**
- `pop.mp3` : Son de clic pour les interactions
- `swoosh-1.mp3` et `swoosh-2.mp3` : Sons de transition
- `tv-static.mp3` : Effet de statique pour les transitions entre jeux
- `new-drawer.mp3` : Notification pour un nouveau dessinateur

## Utilisation dans le code

### Chargement des images

Les images sont généralement chargées via des balises HTML `<img>` avec des chemins relatifs :

```html
<img src="/static/images/logo/logo.png" alt="Logo du jeu">
```

Dans le JavaScript, les images sont référencées dans les configurations des jeux :

```javascript
const games = {
  "quiz-rush": {
    preview: "/static/images/preview/quiz-rush.png",
    // ...
  }
};
```

### Gestion des fichiers audio

Les fichiers audio sont chargés et contrôlés via l'API Audio de JavaScript :

```javascript
const audio = new Audio("/static/music/draw-contest.mp3");
audio.loop = true;
audio.play();
```

Les effets sonores sont généralement préchargés dans des éléments HTML `<audio>` :

```html
<audio id="staticSound" src="/static/music/tv-static.mp3" preload="auto"></audio>
```

## Optimisation des ressources

### Préchargement
Les ressources critiques sont préchargées pour améliorer les performances :

```html
<link rel="preload" href="/static/music/pop.mp3" as="audio">
```

### Mise en cache
Les en-têtes HTTP sont configurés pour mettre en cache les ressources statiques :

```python
self.send_header('Cache-Control', 'max-age=3600')
```

### Chargement conditionnel
Les ressources non essentielles sont chargées conditionnellement pour optimiser les performances :

```javascript
if (!isMuted) audio.play().catch(console.error);
```

## Création et modification des ressources

### Outils recommandés
- **Images** : Adobe Photoshop, GIMP, ou Figma pour la création et l'édition
- **Audio** : Audacity pour l'édition, normalisation et conversion des fichiers audio

### Directives pour les nouvelles ressources
1. **Cohérence visuelle** : Maintenir le style visuel existant
2. **Optimisation** : Compresser les images et audio sans perte de qualité perceptible
3. **Nommage** : Suivre les conventions de nommage existantes
4. **Formats** : Utiliser PNG pour les images avec transparence, JPEG pour les photos, MP3 pour l'audio

## Considérations techniques

### Compatibilité navigateur
Toutes les ressources sont compatibles avec les navigateurs modernes (Chrome, Firefox, Safari, Edge).

### Performances
- Les images sont optimisées pour un chargement rapide
- Les fichiers audio sont compressés pour réduire la taille tout en maintenant une qualité acceptable
- Le préchargement et la mise en cache sont utilisés pour améliorer les performances

### Accessibilité
- Les images importantes ont des attributs `alt` pour l'accessibilité
- Le jeu peut être utilisé sans son (option de désactivation du son)

## Ajout de nouvelles ressources

Pour ajouter de nouvelles ressources au jeu :

1. Créer ou obtenir la ressource dans un format approprié
2. Optimiser la ressource pour le web
3. Placer le fichier dans le dossier approprié sous `Files/static/`
4. Référencer la ressource dans le code HTML/JavaScript
5. Tester la ressource dans différents navigateurs et appareils
