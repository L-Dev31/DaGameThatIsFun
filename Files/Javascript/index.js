import LobbyManager from './lobby_manager.js';
import { navigateLobby } from './lobby_redirection.js';

document.addEventListener("DOMContentLoaded", async () => {
  const playersContainer = document.getElementById("playersContainer");

  async function updatePlayers() {
    const players = await LobbyManager.getActivePlayers();
    if (players.length === 0 && localStorage.getItem('roomCode')) {
      localStorage.removeItem('roomCode');
      localStorage.removeItem('userId');
      window.location.reload();
      return;
    }
    playersContainer.innerHTML = "";
    players.forEach(player => {
      const playerDiv = document.createElement("div");
      playerDiv.classList.add("player");
      playerDiv.innerHTML = `
        <img src="${player.avatar}" alt="${player.name}" class="player-avatar">
        <span class="player-name">${player.name}${player.isCurrentUser ? ' (Vous)' : ''}${player.isOwner ? ' 👑' : ''}</span>
      `;
      playersContainer.appendChild(playerDiv);
    });
  }

  await updatePlayers();
  setInterval(updatePlayers, 5000);

  const introScreen = document.getElementById("introScreen");
  setTimeout(() => {
    introScreen.classList.add("hidden");
    setTimeout(() => {
      introScreen.style.display = "none";
    }, 1000);
  }, 8000);

  const staticSound = document.getElementById("staticSound");
  const staticEffect = document.querySelector(".tv-static");
  const soundToggle = document.getElementById("soundToggle");
  let isMuted = true;
  const audio = new Audio("/static/music/draw-contest.mp3");
  audio.loop = true;

  function updateSoundIcon() {
    soundToggle.innerHTML = isMuted ? `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </svg>` : `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
      </svg>`;
  }

  soundToggle.addEventListener("click", () => {
    isMuted = !isMuted;
    if (isMuted) audio.pause();
    else audio.play().catch(console.error);
    updateSoundIcon();
  });
  updateSoundIcon();

  const games = {
    "draw-contest": {
      title: "Dessine moi un Désastre",
      description: "Une phrase loufoque, des dessins absurdes, et un vote pour élire l'œuvre la plus iconique. À vos pinceaux, le massacre commence ! \n 4 à 8 Joueurs",
      preview: "/static/images/preview/draw-contest.png",
      music: "/static/music/draw-contest.mp3",
      playerNumber: "4-8"
    },
    "pictionary": {
      title: "Gribouilles & Embrouilles",
      description: "Montrez vos talents artistiques ! Un joueur dessine pendant que les autres se dépêchent de deviner le mot.",
      preview: "/static/images/preview/banner.png",
      music: "/static/music/pictionary.mp3",
      playerNumber: "2-8"
    },
    "quiz-rush": {
      title: "Quiz Rush",
      description: "Pensez vite ! Répondez à des questions originales dans ce quiz effréné.",
      preview: "/static/images/preview/quiz-rush.png",
      music: "/static/music/quiz-rush.mp3",
      playerNumber: "2-8"
    },
    "object-tales": {
      title: "La Quête Légendaire",
      description: "Devenez le maître du récit ! Inventez l'histoire la plus drôle ou intrigante à propos d'un objet étrange.",
      preview: "/static/images/preview/object-tales.png",
      music: "/static/music/object-tales.mp3",
      playerNumber: "4-8",
      disabled: true
    }
  };

  function changeGamePreview(gameId) {
    const game = games[gameId];
    if (!game) return;
    staticEffect.classList.add("show-static");
    staticSound.currentTime = 0;
    staticSound.play();
    setTimeout(() => {
      document.getElementById("previewImage").src = game.preview;
      document.getElementById("previewTitle").textContent = game.title;
      document.getElementById("previewDescription").textContent = game.description;
      document.getElementById("previewPlayerNumber").textContent = game.playerNumber + " Joueurs";
      if (audio.src !== game.music) {
        audio.src = game.music;
        audio.load();
        if (!isMuted) audio.play().catch(console.error);
      }
      staticEffect.classList.remove("show-static");
    }, 200);
  }

  document.querySelectorAll('.game-button').forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      changeGamePreview(button.dataset.game);
      document.querySelectorAll('.game-button').forEach(btn => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  const previewButton = document.querySelector('.preview-button');
  previewButton.addEventListener('click', () => {
    const activeGame = document.querySelector('.game-button.active')?.dataset.game;
    if (!activeGame) return;

    const gameUrls = {
      'draw-contest': '/Games/loading/loading.html?game=draw-contest',
      'pictionary': '/Games/loading/loading.html?game=pictionary',
      'quiz-rush': '/Games/loading/loading.html?game=quiz-rush'
    };

    if (gameUrls[activeGame]) {
      navigateLobby(gameUrls[activeGame]);
    }
  });

  const roomCode = localStorage.getItem("roomCode");
  if (roomCode) {
    document.getElementById("playersContainer").style.display = "block";
    const createLobbyLink = document.getElementById("createLobbyLink");
    const joinLobbyLink = document.getElementById("joinLobbyLink");
    const creditsLink = document.getElementById("creditsLink");

    const lobby = await LobbyManager.getCurrentLobby();
    const isOwner = lobby?.isOwner || false;

    createLobbyLink.innerHTML = `<button class="action-button quit-lobby">Quitter</button>`;
    joinLobbyLink.innerHTML = `<button class="action-button add-players" ${!isOwner ? 'disabled' : ''}>Aj. Joueurs</button>`;
    creditsLink.innerHTML = `<button class="action-button credits">Credits</button>`;

    createLobbyLink.querySelector('button').addEventListener('click', async () => {
      if (confirm("Êtes-vous sûr de vouloir quitter le lobby ?")) {
        await LobbyManager.leaveLobby();
        window.location.reload();
      }
    });

    joinLobbyLink.querySelector('button').addEventListener('click', () => {
      navigateLobby('waiting_room.html');
    });

    creditsLink.querySelector('button').addEventListener('click', () => {
      navigateLobby('credits.html');
    });
  }

  if (roomCode) LobbyManager.startPolling();
});