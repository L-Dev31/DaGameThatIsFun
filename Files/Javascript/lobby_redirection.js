import LobbyManager from './lobby_manager.js';

export async function automaticRedirect(url) {
  const roomCode = localStorage.getItem('roomCode');
  let payload = { url: `${url}?roomCode=${roomCode}`, force: true };
  // Si la destination est la salle d'attente, mettre à jour le status du lobby
  if (url.includes("waiting_room.html")) {
    payload.newState = 'waiting';
  }
  await LobbyManager.sendCommandToPlayers('redirect', payload);
  window.location.href = `${url}?roomCode=${roomCode}`;
}
