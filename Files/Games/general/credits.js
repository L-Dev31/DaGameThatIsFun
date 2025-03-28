let curtainLeft = null;
let curtainRight = null;
let creditsMusic = null;

function preloadCurtains() {
    console.log("[CREDITS] Préchargement des rideaux pour les crédits");
    curtainLeft = new Image();
    curtainLeft.src = 'images/curtain_left.png';
    curtainRight = new Image();
    curtainRight.src = 'images/curtain_right.png';
    creditsMusic = new Audio('music/Credit.mp3');
}

function showEndGameCurtains(players) {
    console.log("[CREDITS] Affichage des crédits de fin de jeu", players);

    if (!players || players.length === 0) {
        console.error("[ERROR] Erreur : Aucun joueur trouvé !");
        return;
    }

    try {
        const leftCurtainDiv = document.createElement('div');
        leftCurtainDiv.id = 'left-curtain';
        const rightCurtainDiv = document.createElement('div');
        rightCurtainDiv.id = 'right-curtain';

        document.body.appendChild(leftCurtainDiv);
        document.body.appendChild(rightCurtainDiv);

        setTimeout(() => {
            leftCurtainDiv.style.left = '0';
            rightCurtainDiv.style.right = '0';
            console.log("[CREDITS] Animation des rideaux (fermeture)");

            setTimeout(() => {
                document.querySelector('.main-container').style.display = 'none';
                creditsMusic.play().catch(error => console.error("[ERROR] Erreur musique crédits :", error));
                console.log("[CREDITS] Lecture de la musique des crédits");

                leftCurtainDiv.style.left = '-40%';
                rightCurtainDiv.style.right = '-40%';
                console.log("[CREDITS] Animation des rideaux (ouverture)");

                showCreditsScreen(players);
                document.addEventListener('keydown', handleKeyPress);

                document.querySelector('.overlay-gradient').classList.add('credit');

                creditsMusic.onended = () => {
                    console.log("[CREDITS] Fin de la musique des crédits");
                    // Si je suis l'owner, je redirige tout le monde vers l'index
                    if (window.isOwner) {
                        console.log("[CREDITS] Redirection automatique vers l'index (owner)");
                        import('/Games/general/lobby_manager.js').then(module => {
                            const LobbyManager = module.LobbyManager;
                            LobbyManager.sendCommandToPlayers("redirect", {
                                url: `/waiting_room.html`,
                              });
                            console.log("[COMMAND] Commande exit-credits envoyée");
                        });
                    }
                    window.location.href = '/waiting_room.html';
                };
            }, 5000);
        }, 100);
    } catch (error) {
        console.error("[ERROR] Erreur lors de l'affichage des crédits:", error);
    }
}

function handleKeyPress(event) {
    // Seul l'owner peut quitter les crédits avec la touche Espace
    if (event.code === 'Space' && window.isOwner) {
        console.log("[CREDITS] Touche Espace détectée, sortie des crédits (owner)");
        import('/Games/general/lobby_manager.js').then(module => {
            const LobbyManager = module.LobbyManager;
            LobbyManager.sendCommandToPlayers('exit-credits', {
                redirect: '/index.html'
            });
            console.log("[COMMAND] Commande exit-credits envoyée");
            window.location.href = '/index.html';
        });
    } else if (event.code === 'Space' && !window.isOwner) {
        console.log("[CREDITS] Touche Espace détectée, mais ignorée (non-owner)");
    }
}

function showCreditsScreen(players) {
    console.log("[CREDITS] Affichage de l'écran des crédits");
    try {
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
        console.log("[CREDITS] Classement des joueurs", sortedPlayers);
        
        const creditsContainer = document.createElement('div');
        creditsContainer.id = 'credits-container';

        const logoImg = document.createElement('img');
        logoImg.src = 'images/logo.png';
        logoImg.alt = 'Quiz Rush Logo';
        logoImg.classList.add('credits-logo');
        creditsContainer.appendChild(logoImg);

        const devsDiv = document.createElement('div');
        devsDiv.innerHTML = `
            <h2>Développement et Design Graphique</h2>
            <p>Léo Tosku</p>
            <h2>Création de la vidéo de présentation</h2>
            <p>Korail Lamothe Jacob</p>
            <h2>Game design</h2>
            <p>Axel Desbonnes, Léo Tosku</p>
        `;
        creditsContainer.appendChild(devsDiv);

        const leaderboardDiv = document.createElement('div');
        leaderboardDiv.innerHTML = `<h2 style="margin-top: 3vh">Classement Final</h2>`;
        const playersGrid = document.createElement('div');
        playersGrid.classList.add('players-grid');

        sortedPlayers.forEach((player, index) => {
            const playerCard = document.createElement('div');
            playerCard.classList.add('leaderboard-player');
            if (index === 0) playerCard.classList.add('rank-1');
            else if (index === 1) playerCard.classList.add('rank-2');
            else if (index === 2) playerCard.classList.add('rank-3');

            playerCard.innerHTML = `
                <span>#${index + 1}</span>
                <img src="${player.avatar}" alt="${player.name}">
                <p>${player.name}</p>
                <p>${player.score} points</p>
            `;
            playersGrid.appendChild(playerCard);
        });

        leaderboardDiv.appendChild(playersGrid);
        creditsContainer.appendChild(leaderboardDiv);

        const exitHint = document.createElement('div');
        exitHint.classList.add('exit-hint');
        
        // Afficher l'indication de sortie uniquement pour l'owner
        if (window.isOwner) {
            exitHint.innerHTML = `<img src="/Games/general/images/space.png" alt="Space">`;
            console.log("[CREDITS] Affichage de l'indication de sortie (owner)");
        } else {
            exitHint.innerHTML = `<p>Attendez que l'hôte quitte les crédits...</p>`;
            console.log("[CREDITS] Affichage du message d'attente (non-owner)");
        }
        
        creditsContainer.appendChild(exitHint);
        document.body.appendChild(creditsContainer);
    } catch (error) {
        console.error("[ERROR] Erreur lors de l'affichage de l'écran des crédits:", error);
    }
}

export { preloadCurtains, showEndGameCurtains };
