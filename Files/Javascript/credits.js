import { LobbyManager } from './lobby_manager.js';

document.addEventListener("DOMContentLoaded", async () => {
  LobbyManager.init();

  document.addEventListener("lobby-players-updated", (event) => {
    const players = event.detail;
    LobbyManager.renderPlayers(players);
  });

  const backButton = document.querySelector('.action-button');
  if (!backButton) {
    console.error("[CREDITS] Le bouton de retour est introuvable dans le DOM.");
    return;
  }

  const inLobby = !!localStorage.getItem("roomCode");
  const isOwner = inLobby ? await LobbyManager.isCurrentUserOwner() : false;

  if (inLobby && !isOwner) {
    backButton.disabled = true;
  }

  backButton.onclick = async () => {
    try {
      if (inLobby) {
        if (isOwner) {
          await LobbyManager.sendCommandToPlayers('redirect', {
            url: `index.html?roomCode=${localStorage.getItem('roomCode')}`
          });
        }
      } else {
        window.location.href = "index.html";
      }
    } catch (error) {
      console.error("[CREDITS] Erreur lors de la gestion du clic sur le bouton de retour :", error);
    }
  };
});