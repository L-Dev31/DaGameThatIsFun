// lobby_redirection.js - Gère la redirection synchronisée des joueurs par l'owner

import LobbyManager from './lobby_manager.js';

export async function navigateLobby(url) {
  const isOwner = await LobbyManager.isCurrentUserOwner();
  const roomCode = localStorage.getItem('roomCode');

  if (isOwner && roomCode) {
    // Envoie une commande de redirection à tous les joueurs
    await LobbyManager.sendCommandToPlayers('redirect', { 
      url: `${url}?roomCode=${roomCode}`,
      force: true 
    });
  }
  
  // Redirige l'utilisateur courant
  window.location.href = `${url}${roomCode ? `?roomCode=${roomCode}` : ''}`;
}
