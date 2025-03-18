import { LobbyManager } from './lobby_manager.js';

document.addEventListener("DOMContentLoaded", async () => {
  LobbyManager.init();

  document.addEventListener("lobby-players-updated", (event) => {
    const players = event.detail;
    LobbyManager.renderPlayers(players); // Rendu des joueurs via LobbyManager
  });

  const backButton = document.querySelector('.action-button');
  backButton.onclick = async () => {
    try {
      const isOwner = await LobbyManager.isCurrentUserOwner();
      if (isOwner) {
        await LobbyManager.sendCommandToPlayers('redirect', {
          url: `index.html?roomCode=${localStorage.getItem('roomCode')}`
        });
      }
    } catch (error) {
      console.error("[CREDITS] Erreur lors de la gestion du clic sur le bouton de retour :", error);
    }
  };
});