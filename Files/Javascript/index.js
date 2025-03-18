import { LobbyManager } from './lobby_manager.js';

document.addEventListener("DOMContentLoaded", async () => {
  LobbyManager.init();

  // Gestion des événements personnalisés pour mettre à jour l'interface utilisateur
  document.addEventListener("lobby-players-updated", (event) => {
    const players = event.detail;
    LobbyManager.renderPlayers(players);
  });

  // Gestion de l'écran d'introduction
  const introScreen = document.getElementById("introScreen");
  if (!localStorage.getItem('introSeen')) {
    localStorage.setItem('introSeen', 'true');
  } else {
    introScreen.style.display = 'none';
  }

  setTimeout(() => {
    introScreen.classList.add("hidden");
    setTimeout(() => {
      introScreen.style.display = "none";
    }, 1000);
  }, 8000);

  // Gestion du son
  const staticSound = document.getElementById("staticSound");
  const staticEffect = document.querySelector(".tv-static");
  const soundToggle = document.getElementById("soundToggle");
  let isMuted = true;

  const audio = new Audio("/static/music/draw-contest.mp3");
  audio.loop = true;

  function updateSoundIcon() {
    soundToggle.innerHTML = isMuted
      ? `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        </svg>`
      : `
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

  // Configuration des jeux
  const games = {
    "draw-contest": {
      title: "Dessine moi un Désastre",
      description:
        "Une phrase loufoque, des dessins absurdes, et un vote pour élire l’œuvre la plus iconique. À vos pinceaux, le massacre commence ! 4 à 8 Joueurs",
      preview: "/static/images/preview/draw-contest.png",
      music: "/static/music/draw-contest.mp3",
      playerNumber: "3-8",
    },
    "pictionary": {
      title: "Gribouilles & Embrouilles",
      description:
        "Montrez vos talents artistiques ! Un joueur dessine pendant que les autres se dépêchent de deviner le mot.",
      preview: "/static/images/preview/pictionary.png",
      music: "/static/music/pictionary.mp3",
      playerNumber: "3-8",
    },
    "quiz-rush": {
      title: "Quiz Rush",
      description: "Pensez vite ! Répondez à des questions originales dans ce quiz effréné.",
      preview: "/static/images/preview/quiz-rush.png",
      music: "/static/music/quiz-rush.mp3",
      playerNumber: "2-8",
    },
    "object-tales": {
      title: "La Quête Légendaire",
      description:
        "Devenez le maître du récit ! Inventez l'histoire la plus drôle ou intrigante à propos d'un objet étrange.",
      preview: "/static/images/preview/object-tales.png",
      music: "/static/music/object-tales.mp3",
      playerNumber: "4-8",
      disabled: true,
    },
  };

  // Mise à jour du bouton de lancement de jeux
  async function updatePreviewButtonState() {
    const previewButton = document.getElementById("previewButton");
    const roomCode = localStorage.getItem("roomCode");
    const activeGame = document.querySelector(".game-button.active")?.dataset.game;

    if (!roomCode || !activeGame) {
      previewButton.style.display = "none";
      return;
    }

    try {
      const lobby = await LobbyManager.getCurrentLobby();
      const players = await LobbyManager.getActivePlayers();
      const gameInfo = games[activeGame];
      const minPlayers = parseInt(gameInfo.playerNumber.split("-")[0]);
      const isOwner = lobby?.isOwner;
      const hasEnoughPlayers = players.length >= minPlayers;
      const shouldShowButton = isOwner && roomCode;

      previewButton.style.display = shouldShowButton ? "flex" : "none";
      previewButton.disabled = !hasEnoughPlayers;
    } catch (error) {
      previewButton.style.display = "none";
    }
  }

  setInterval(updatePreviewButtonState, 3000);

  // Changement de l'aperçu du jeu
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

  // Ajout des écouteurs d'événements pour les boutons de jeu
  document.querySelectorAll(".game-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      changeGamePreview(button.dataset.game);
      document.querySelectorAll(".game-button").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
    });
  });

  // Gestion du bouton de prévisualisation
  const previewButton = document.querySelector(".preview-button");
  previewButton.addEventListener("click", () => {
    const activeGame = document.querySelector(".game-button.active")?.dataset.game;
    const roomCode = localStorage.getItem("roomCode");

    if (activeGame && roomCode) {
      const gameUrl = `/Games/loading/loading.html?game=${activeGame}&roomCode=${roomCode}`;
      LobbyManager.automaticRedirect(gameUrl);
    }
  });

  // Chargement des boutons de bas de page
  loadBottomButtons();
});

// Chargement des boutons de bas de page
async function loadBottomButtons() {
  try {
    const response = await fetch("button_config.json");
    const config = await response.json();
    const bottomActions = document.getElementById("bottomActions");
    if (!bottomActions) {
      console.error("L'élément 'bottomActions' est introuvable dans le DOM.");
      return;
    }

    const inLobby = !!localStorage.getItem("roomCode");
    const isOwner = inLobby ? await LobbyManager.isCurrentUserOwner() : false; // Vérifie si l'utilisateur est propriétaire
    const buttons = inLobby ? config.inLobby : config.outLobby;

    bottomActions.innerHTML = "";
    buttons.forEach((btn) => {
      const a = document.createElement("a");
      if (btn.link) {
        a.href = btn.link;
      }

      const button = document.createElement("button");
      button.className = "action-button";
      if (btn.action) button.classList.add(btn.action);
      button.innerHTML = btn.icon + btn.title;

      // Désactive les boutons spécifiques pour les non-propriétaires
      if (inLobby && ["credits", "waiting"].includes(btn.action)) {
        button.disabled = !isOwner;
      }

      button.addEventListener("click", async (e) => {
        e.preventDefault();

        if (inLobby) {
          if (btn.action === "quit") {
            if (confirm("Êtes-vous sûr de vouloir quitter le lobby ?")) {
              await LobbyManager.leaveLobby();
              localStorage.removeItem("roomCode");
              window.location.href = "index.html";
            }
          } else if (btn.action === "credits") {
            const lobby = await LobbyManager.getCurrentLobby();
            if (lobby && lobby.isOwner) {
              await LobbyManager.sendCommandToPlayers("redirect", {
                url: `credits.html?roomCode=${localStorage.getItem("roomCode")}`,
              });
            } else {
              LobbyManager.automaticRedirect(`credits.html?roomCode=${localStorage.getItem("roomCode")}`);
            }
          } else if (btn.action === "waiting") {
            await LobbyManager.sendCommandToPlayers("redirect", {
              url: `waiting_room.html?roomCode=${localStorage.getItem("roomCode")}`,
            });
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
  } catch (error) {
    console.error("[INDEX] Erreur lors du chargement des boutons:", error);
  }
}