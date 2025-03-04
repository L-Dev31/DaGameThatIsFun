import LobbyManager from './lobby_manager.js';

export async function automaticRedirect(url) {
  const roomCode = localStorage.getItem('roomCode');
  let payload = { url: `${url}?roomCode=${roomCode}`, force: true };
  if (url.includes("waiting_room.html")) {
    payload.newState = 'waiting';
  }
  console.log(`[REDIRECTION] Envoi de la commande de redirection vers ${url}?roomCode=${roomCode}`);
  await LobbyManager.sendCommandToPlayers('redirect', payload);
  window.location.href = `${url}?roomCode=${roomCode}`;
}
