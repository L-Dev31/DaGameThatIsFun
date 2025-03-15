import LobbyManager from './lobby_manager.js';

document.addEventListener("DOMContentLoaded", async () => {
  const playersContainer = document.getElementById("playersContainer");
  const introScreen = document.getElementById("introScreen");
  const roomCode = localStorage.getItem('roomCode');
  const games = {
    "draw-contest": {
      title: "Dessine moi un Désastre",
      description: "Une phrase loufoque, des dessins absurdes, et un vote pour élire l'œuvre la plus iconique. À vos pinceaux, le massacre commence ! \n4 à 8 Joueurs",
      preview: "/static/images/preview/draw-contest.png",
      music: "/static/music/draw-contest.mp3",
      playerNumber: "3-8"
    },
    "pictionary": {
      title: "Gribouilles & Embrouilles",
      description: "Montrez vos talents artistiques ! Un joueur dessine pendant que les autres se dépêchent de deviner le mot.",
      preview: "/static/images/preview/pictionary.png",
      music: "/static/music/pictionary.mp3",
      playerNumber: "3-8"
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

  LobbyManager.addCommandListener('redirect', (payload) => {
    const currentPath = window.location.pathname.split('/').pop();
    const targetPath = new URL(payload.url, window.location.href).pathname.split('/').pop();
    if (payload.force || currentPath !== targetPath) {
      sessionStorage.setItem('isRedirecting', 'true');
      window.location.href = payload.url;
    }
  });

  if (introScreen) {
    if (localStorage.getItem('introSeen')) {
      introScreen.style.display = 'none';
    } else {
      localStorage.setItem('introSeen', 'true');
      setTimeout(() => {
        introScreen.classList.add("hidden");
        setTimeout(() => {
          introScreen.style.display = "none";
        }, 1000);
      }, 8000);
    }
  }

  async function updatePlayers() {
    if (!playersContainer) return;
    const players = await LobbyManager.getActivePlayers();
    if (players.length === 0 && roomCode) {
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
    await updatePreviewButtonState();
  }

  async function updatePreviewButtonState() {
    const previewButton = document.getElementById('previewButton');
    const activeGame = document.querySelector('.game-button.active')?.dataset.game;
    if (!roomCode || !activeGame) {
      if (previewButton) previewButton.style.display = 'none';
      return;
    }
    try {
      const lobby = await LobbyManager.getCurrentLobby();
      const players = await LobbyManager.getActivePlayers();
      const gameInfo = games[activeGame];
      const minPlayers = parseInt(gameInfo.playerNumber.split('-')[0]);
      const isOwner = lobby?.isOwner;
      const hasEnoughPlayers = players.length >= minPlayers;
      const shouldShowButton = isOwner && roomCode;
      if (previewButton) {
        previewButton.style.display = shouldShowButton ? 'flex' : 'none';
        previewButton.disabled = !hasEnoughPlayers;
      }
    } catch (error) {
      if (previewButton) previewButton.style.display = 'none';
    }
  }

  await updatePlayers();
  setInterval(updatePlayers, 5000);

  const staticSound = document.getElementById("staticSound");
  const staticEffect = document.querySelector(".tv-static");
  const soundToggle = document.getElementById("soundToggle");
  let isMuted = true;
  const audio = new Audio("/static/music/draw-contest.mp3");
  audio.loop = true;

  function updateSoundIcon() {
    if (soundToggle) {
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
  }

  soundToggle?.addEventListener("click", () => {
    isMuted = !isMuted;
    isMuted ? audio.pause() : audio.play().catch(() => {});
    updateSoundIcon();
  });
  updateSoundIcon();

  function changeGamePreview(gameId) {
    const game = games[gameId];
    if (!game) return;
    staticEffect?.classList.add("show-static");
    if (staticSound) {
      staticSound.currentTime = 0;
      staticSound.play();
    }
    setTimeout(() => {
      const previewImage = document.getElementById("previewImage");
      const previewTitle = document.getElementById("previewTitle");
      const previewDescription = document.getElementById("previewDescription");
      const previewPlayerNumber = document.getElementById("previewPlayerNumber");
      if (previewImage && previewTitle && previewDescription && previewPlayerNumber) {
        previewImage.src = game.preview;
        previewTitle.textContent = game.title;
        previewDescription.textContent = game.description;
        previewPlayerNumber.textContent = game.playerNumber + " Joueurs";
      }
      if (audio.src !== game.music) {
        audio.src = game.music;
        audio.load();
        if (!isMuted) audio.play().catch(() => {});
        updatePreviewButtonState();
      }
      staticEffect?.classList.remove("show-static");
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
  previewButton?.addEventListener('click', () => {
    const activeGame = document.querySelector('.game-button.active')?.dataset.game;
    if (activeGame && roomCode) {
      sessionStorage.setItem('isRedirecting', 'true');
      window.location.href = `/Games/loading/loading.html?game=${activeGame}&roomCode=${roomCode}`;
    }
  });

  if (roomCode) {
    if (playersContainer) playersContainer.style.display = "flex";
    const createLobbyLink = document.getElementById("createLobbyLink");
    const joinLobbyLink = document.getElementById("joinLobbyLink");
    const creditsLink = document.getElementById("creditsLink");
    const lobby = await LobbyManager.getCurrentLobby();
    const isOwner = lobby?.isOwner || false;
    if (createLobbyLink) {
      createLobbyLink.innerHTML = `
        <button class="action-button quit-lobby">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 17l5-5-5-5"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Quitter
        </button>`;
      createLobbyLink.querySelector('button').addEventListener('click', async () => {
        if (confirm("Êtes-vous sûr de vouloir quitter le lobby ?")) {
          await LobbyManager.leaveLobby();
          localStorage.removeItem('roomCode');
          window.location.href = 'index.html';
        }
      });
    }
    if (joinLobbyLink) {
      joinLobbyLink.innerHTML = `
        <button class="action-button add-players" ${!isOwner ? 'disabled' : ''}>
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ajouter Joueurs
        </button>`;
      joinLobbyLink.querySelector('button').addEventListener('click', () => {
        sessionStorage.setItem('isRedirecting', 'true');
        window.location.href = 'waiting_room.html';
      });
    }
    if (creditsLink) {
      creditsLink.innerHTML = `
        <button class="action-button credits">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
          Credits
        </button>`;
      creditsLink.querySelector('button').addEventListener('click', async () => {
        const lobby = await LobbyManager.getCurrentLobby();
        const url = `credits.html?roomCode=${roomCode}`;
        if (lobby?.isOwner) {
          await LobbyManager.sendCommand('redirect', { url }, { 
            persistent: true,
            priority: 'critical'
          });
        }
        sessionStorage.setItem('isRedirecting', 'true');
        window.location.href = url;
      });
    }
  }

  async function loadBottomButtons() {
    try {
      const response = await fetch('button_config.json');
      const config = await response.json();
      const bottomActions = document.getElementById('bottomActions');
      const inLobby = Boolean(roomCode);
      if (!bottomActions) return;
      const buttons = inLobby ? config.inLobby : config.outLobby;
      bottomActions.innerHTML = '';
      buttons.forEach(btn => {
        const a = document.createElement('a');
        if (btn.link) a.href = btn.link;
        const button = document.createElement('button');
        button.className = 'action-button';
        if (btn.action) button.classList.add(btn.action);
        button.innerHTML = btn.icon + btn.title;
        button.addEventListener('click', async (e) => {
          e.preventDefault();
          if (inLobby) {
            if (btn.action === 'quit') {
              if (confirm("Êtes-vous sûr de vouloir quitter le lobby ?")) {
                await LobbyManager.leaveLobby();
                localStorage.removeItem('roomCode');
                window.location.href = 'index.html';
              }
            } else if (btn.action === 'credits') {
              const lobby = await LobbyManager.getCurrentLobby();
              const url = `credits.html?roomCode=${roomCode}`;
              if (lobby?.isOwner) {
                await LobbyManager.sendCommand('redirect', { url }, { priority: 'high' });
              }
              sessionStorage.setItem('isRedirecting', 'true');
              window.location.href = url;
            } else if (btn.action === 'waiting') {
              sessionStorage.setItem('isRedirecting', 'true');
              window.location.href = `waiting_room.html?roomCode=${roomCode}`;
            } else if (btn.link) {
              window.location.href = btn.link;
            }
          } else {
            if (btn.link) {
              window.location.href = btn.link;
            }
          }
        });
        a.appendChild(button);
        bottomActions.appendChild(a);
      });
    } catch (error) {}
  }
  loadBottomButtons();
});

window.addEventListener('beforeunload', async () => {
  const lobby = await LobbyManager.getCurrentLobby();
  if (lobby?.isOwner) {
    await LobbyManager.leaveLobby();
  }
});

const roomCodeGlobal = localStorage.getItem('roomCode');
if (!roomCodeGlobal) {
  localStorage.removeItem('roomCode');
  localStorage.removeItem('userId');
  LobbyManager.stopPolling();
} else {
  LobbyManager.init();
}