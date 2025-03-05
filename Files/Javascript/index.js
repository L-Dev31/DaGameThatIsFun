// index.js - Script principal pour la page d'accueil / sélection de jeu

import LobbyManager from './lobby_manager.js';
import { automaticRedirect } from './lobby_redirection.js';

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
      description: "Une phrase loufoque, des dessins absurdes, et un vote pour élire l'œuvre la plus iconique. À vos pinceaux, le massacre commence ! \n4 à 8 Joueurs",
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
      automaticRedirect(gameUrls[activeGame]);
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

    createLobbyLink.innerHTML = `
      <button class="action-button quit-lobby">
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M16 17l5-5-5-5"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Quitter
      </button>`;
    joinLobbyLink.innerHTML = `
      <button class="action-button add-players" ${!isOwner ? 'disabled' : ''}>
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Ajouter Joueurs
      </button>`;
    creditsLink.innerHTML = `
      <button class="action-button credits">
        <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </svg>
        Credits
      </button>`;

    createLobbyLink.querySelector('button').addEventListener('click', async () => {
      if (confirm("Êtes-vous sûr de vouloir quitter le lobby ?")) {
        await LobbyManager.leaveLobby();
        window.location.reload();
      }
    });

    joinLobbyLink.querySelector('button').addEventListener('click', () => {
      automaticRedirect('waiting_room.html');
    });

    creditsLink.querySelector('button').addEventListener('click', () => {
      automaticRedirect('credits.html');
    });
  }

  if (roomCode) LobbyManager.startPolling();
});

const roomCode = localStorage.getItem('roomCode');

window.addEventListener('beforeunload', async () => {
  const lobby = await LobbyManager.getCurrentLobby();
  if (lobby?.isOwner) {
    console.log("[INDEX] Owner quitte la page, nettoyage du lobby");
    await LobbyManager.leaveLobby();
  }
});

if (!roomCode) {
  localStorage.removeItem('roomCode');
  localStorage.removeItem('userId');
  LobbyManager.stopPolling();
} else {
  LobbyManager.init();
}

async function loadBottomButtons() {
  try {
    const response = await fetch('button_config.json');
    const config = await response.json();
    const bottomActions = document.getElementById('bottomActions');
    const inLobby = localStorage.getItem('roomCode') ? true : false;
    console.log(`[INDEX] Mode ${inLobby ? "EN LOBBY" : "HORS LOBBY"} – chargement de la configuration des boutons.`);
    const buttons = inLobby ? config.inLobby : config.outLobby;
    bottomActions.innerHTML = '';
    buttons.forEach(btn => {
      const a = document.createElement('a');
      if (btn.link) {
        a.href = btn.link;
      }
      const button = document.createElement('button');
      button.className = 'action-button';
      if (btn.action) button.classList.add(btn.action);
      button.innerHTML = btn.icon + btn.title;
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        console.log(`[INDEX] Bouton cliqué: ${btn.title}`);
        if (inLobby) {
          if (btn.action === 'quit') {
            if (confirm("Êtes-vous sûr de vouloir quitter le lobby ?")) {
              console.log("[INDEX] Quitter le lobby demandé.");
              await LobbyManager.leaveLobby();
              localStorage.removeItem('roomCode');
              window.location.href = 'index.html';
            }
          } else if (btn.action === 'credits') {
            const lobby = await LobbyManager.getCurrentLobby();
            if (lobby && lobby.isOwner) {
              console.log("[INDEX] Owner quittant le lobby pour accéder aux Credits.");
              await LobbyManager.sendCommandToPlayers('redirect', { url: `credits.html?roomCode=${roomCode}` });
              window.location.href = `credits.html?roomCode=${roomCode}`;
            } else {
              console.log("[INDEX] Redirection automatique vers Credits pour non-owner.");
              automaticRedirect(`credits.html?roomCode=${roomCode}`);
            }
          } else if (btn.action === 'waiting') {
            console.log("[INDEX] Owner envoie une commande pour que tout le monde aille en salle d'attente.");
            await LobbyManager.sendCommandToPlayers('redirect', { url: `waiting_room.html?roomCode=${roomCode}` });
            window.location.href = `waiting_room.html?roomCode=${roomCode}`;
          } else if (btn.link) {
            console.log(`[INDEX] Redirection vers ${btn.link}`);
            window.location.href = btn.link;
          }
        } else {
          if (btn.link) {
            console.log(`[INDEX] Redirection vers ${btn.link} (mode hors lobby)`);
            window.location.href = btn.link;
          }
        }
      });
      a.appendChild(button);
      bottomActions.appendChild(a);
    });
  } catch (error) {
    console.error("[INDEX] Erreur lors du chargement des boutons:", error);
  }
}

// Vérifie si l'intro a déjà été vue
document.addEventListener("DOMContentLoaded", function() {
  if (localStorage.getItem('introSeen')) {
    document.getElementById('introScreen').style.display = 'none';
  } else {
    localStorage.setItem('introSeen', 'true');
  }
});

loadBottomButtons();