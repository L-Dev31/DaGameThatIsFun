
import LobbyManager from './lobby_manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const playersContainer = document.getElementById('playersContainer');

    async function updatePlayers() {
        const players = await LobbyManager.getActivePlayers();
        playersContainer.innerHTML = '';
        players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player');
            playerDiv.innerHTML = `
                <img src="${player.avatar}" alt="${player.name}" class="player-avatar">
                <span class="player-name">${player.name}</span>
            `;
            playersContainer.appendChild(playerDiv);
        });
    }

    // Mise à jour initiale
    await updatePlayers();
    // Actualisation périodique toutes les 5 secondes
    setInterval(updatePlayers, 5000);
});


document.addEventListener('DOMContentLoaded', () => {
    const introScreen = document.getElementById('introScreen');
    const previewImage = document.getElementById('previewImage');
    const previewTitle = document.getElementById('previewTitle');
    const previewDescription = document.getElementById('previewDescription');
    const previewPlayerNumber = document.getElementById('previewPlayerNumber');
    const gameButtons = document.querySelectorAll('.game-button');
    const staticSound = document.getElementById('staticSound');
    const staticEffect = document.querySelector('.tv-static');
    const previewContent = document.querySelector('.preview-content');
    const soundToggle = document.getElementById('soundToggle');
    let isMuted = true; // Par défaut, le son est en mode muet
    const audio = new Audio('/static/music/draw-contest.mp3');
    audio.loop = true;

    const games = {
        'draw-contest': {
            title: 'Dessine moi un Désastre',
            description: 'Une phrase loufoque, des dessins absurdes, et un vote pour élire l\'œuvre la plus iconique. À vos pinceaux, le massacre commence ! \n 4 à 8 Joueurs',
            preview: '/static/images/preview/draw-contest.png',
            music: '/static/music/draw-contest.mp3',
            playerNumber: "4-8"
        },
        'pictionary': {
            title: 'Gribouilles & Embrouilles',
            description: 'Montrez vos talents artistiques ! Un joueur dessine pendant que les autres se dépêchent de deviner le mot. Votre chef-d\'œuvre sera-t-il compris ou hilaramment mal interprété ?',
            preview: '/static/images/preview/banner.png',
            music: '/static/music/pictionary.mp3',
            playerNumber: "2-8"
        },
        'quiz-rush': {
            title: 'Quiz Rush',
            description: 'Pensez vite ! Répondez à des questions originales dans ce quiz effréné. Plus vous répondez vite, plus vous marquez de points - mais méfiez-vous des questions pièges !',
            preview: '/static/images/preview/quiz-rush.png',
            music: '/static/music/quiz-rush.mp3',
            playerNumber: "2-8"
        },
        'object-tales': {
            title: 'La Quête Légendaire',
            description: 'Devenez le maître du récit ! Inventez l\'histoire la plus drôle ou intrigante à propos d\'un objet étrange. Parviendrez-vous à captiver le public avec votre imagination débordante ?',
            preview: '/static/images/preview/object-tales.png',
            music: '/static/music/object-tales.mp3',
            playerNumber: "4-8",
            disabled: true
        }
    };

    function updateSoundIcon() {
        if (isMuted) {
            soundToggle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>`;
        } else {
            soundToggle.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>`;
        }
    }

    soundToggle.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
            audio.pause();
        } else {
            audio.play().catch(console.error);
        }
        updateSoundIcon();
    });

    function changeGamePreview(gameId) {
        const game = games[gameId];
        if (!game) return;

        staticEffect.classList.add('show-static');
        staticSound.currentTime = 0;
        staticSound.play();

        setTimeout(() => {
            previewImage.src = game.preview;
            previewTitle.textContent = game.title;
            previewDescription.textContent = game.description;
            previewPlayerNumber.textContent = game.playerNumber + " Joueurs";

            // Music for each games
            if (audio.src !== game.music) {
                audio.src = game.music;
                audio.load();

                // Do not play if muted
                if (!isMuted) {
                    audio.play().catch(console.error);
                }
            }

            staticEffect.classList.remove('show-static');
        }, 200);
    }

    setTimeout(() => {
        introScreen.classList.add('hidden');
        setTimeout(() => {
            introScreen.style.display = 'none';
        }, 1000);
    }, 8000);

    gameButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.disabled) return;

            const gameId = button.dataset.game;
            changeGamePreview(gameId);

            gameButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    updateSoundIcon();
});
