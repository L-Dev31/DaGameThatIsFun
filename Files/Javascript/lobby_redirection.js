import LobbyManager from './lobby_manager.js';

export async function navigateLobby(url) {
  const isOwner = await LobbyManager.isCurrentUserOwner();
  const roomCode = localStorage.getItem('roomCode');
  
  if (isOwner && roomCode) {
    await LobbyManager.sendCommandToPlayers('redirect', { 
      url: `${url}?roomCode=${roomCode}`,
      force: true 
    });
  }
  
  window.location.href = `${url}${roomCode ? `?roomCode=${roomCode}` : ''}`;
}