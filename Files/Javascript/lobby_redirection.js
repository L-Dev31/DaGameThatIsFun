import LobbyManager from './lobby_manager.js';

async function pollLobbyCommands() {
  const roomCode = localStorage.getItem('roomCode');
  if (!roomCode) return;
  const lobby = await LobbyManager.getCurrentLobby();
  if (!lobby) return; // On s'assure que le lobby existe
  const userId = localStorage.getItem('userId');
  const isOwner = (lobby.owner === userId);
  if (lobby.latest_command) {
    const { command, payload } = lobby.latest_command;
    if (command === 'redirect' && payload.url) {
      // Redirection uniquement pour les non-owners
      if (!isOwner && window.location.pathname !== "/" + payload.url) {
        window.location.replace(payload.url);
      }
    } else if (command === 'return-to-waiting') {
      // Redirection vers waiting_room si la page actuelle n'est pas déjà celle-ci
      if (!isOwner && window.location.pathname !== "/waiting_room.html") {
        window.location.replace(`waiting_room.html?roomCode=${roomCode}`);
      }
    } else if (command === 'lobby-deleted') {
      alert('Le lobby a été supprimé.');
      localStorage.removeItem('roomCode');
      localStorage.removeItem('userId');
      window.location.reload();
    }
  }
}

setInterval(pollLobbyCommands, 2000);
