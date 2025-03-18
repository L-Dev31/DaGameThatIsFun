import { LobbyManager } from './lobby_manager.js';

document.addEventListener("DOMContentLoaded", async () => {
  // Initialisation du LobbyManager
  LobbyManager.init();

  // Gestion des événements personnalisés pour mettre à jour l'interface utilisateur
  document.addEventListener("lobby-players-updated", (event) => {
    const players = event.detail;
    LobbyManager.renderPlayers(players); // Rendu des joueurs via LobbyManager
  });

  // Gestion du bouton "Retour"
  const backButton = document.querySelector('.action-button');
  backButton.onclick = async () => {
    try {
      const isOwner = await LobbyManager.isCurrentUserOwner();
      if (isOwner) {
        console.log("[CREDITS] Owner redirige tout le monde vers l'index.");
        await LobbyManager.sendCommandToPlayers('redirect', {
          url: `index.html?roomCode=${localStorage.getItem('roomCode')}`
        });
      }
    } catch (error) {
      console.error("[CREDITS] Erreur lors de la gestion du clic sur le bouton de retour :", error);
    }
  };

  // Gestion des événements personnalisés pour mettre à jour l'état du lobby
  document.addEventListener("lobby-status", (event) => {
    const { inLobby } = event.detail;
    if (!inLobby) {
      const playersContainer = document.getElementById("playersContainer");
      if (playersContainer) {
        playersContainer.style.display = "none";
      }
    }
  });
});