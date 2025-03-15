import LobbyManager from './lobby_manager.js';

let isOwner = false;
const userId = localStorage.getItem('userId');
const roomCode = localStorage.getItem('roomCode');

if (!roomCode || !userId) window.location.href = '/';

const elements = {
  modal: document.getElementById('confirmationModal'),
  leaveButton: document.getElementById('leaveButton'),
  cancelButton: document.getElementById('cancelButton'),
  confirmButton: document.getElementById('confirmButton'),
  modalMessage: document.getElementById('modalMessage'),
  playersGrid: document.getElementById('playersGrid'),
  startButton: document.getElementById('startButton'),
  countdownOverlay: document.getElementById('countdownOverlay'),
  countdownNumber: document.getElementById('countdownNumber'),
  cancelCountdown: document.getElementById('cancelCountdown'),
  roomCodeDisplay: document.getElementById('roomCode')
};

function updatePlayersGrid(users, ownerId) {
  if (!elements.playersGrid) return;
  elements.playersGrid.innerHTML = '';
  const currentUserId = localStorage.getItem('userId');
  const sortedUsers = Object.values(users).sort((a, b) => {
    if (a.id === ownerId) return -1;
    if (b.id === ownerId) return 1;
    return a.join_time - b.join_time;
  });
  for (let i = 0; i < 8; i++) {
    const slot = document.createElement('div');
    slot.className = `player-slot ${i >= 4 ? 'bottom-row' : ''}`;
    if (i < sortedUsers.length) {
      const user = sortedUsers[i];
      slot.innerHTML = `
        <div class="player-avatar${user.id === currentUserId ? ' current-player' : ''}">
          <img src="/static/images/avatar/${user.avatar_index + 1}.png" alt="${user.name}">
          ${user.id === ownerId ? '<div class="crown">👑</div>' : ''}
        </div>
        <span class="waiting-text">
          <strong>${user.name}</strong>
          ${user.id === currentUserId ? ' (Vous)' : ''}
        </span>`;
    } else {
      slot.innerHTML = `
        <div class="player-avatar empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <span class="waiting-text">En attente...</span>`;
    }
    elements.playersGrid.appendChild(slot);
  }
}

function updateStartButton(userCount) {
  if (elements.startButton) {
    elements.startButton.textContent = `Lancer la partie (${userCount}/8)`;
    elements.startButton.disabled = !isOwner || userCount < 2;
  }
}

async function checkLobbyState() {
  try {
    const lobby = await LobbyManager.getCurrentLobby();
    if (!lobby) return window.location.href = '/';
    isOwner = lobby.owner === userId;
    updatePlayersGrid(lobby.users, lobby.owner);
    updateStartButton(Object.keys(lobby.users).length);
  } catch (error) {
    console.error('Lobby check failed:', error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (elements.roomCodeDisplay) elements.roomCodeDisplay.textContent = roomCode;
  
  LobbyManager.addCommandListener('redirect', payload => {
    console.log('Redirect command received:', payload);
    if (window.location.pathname !== new URL(payload.url).pathname) {
      sessionStorage.setItem('isRedirecting', 'true');
      window.location.href = payload.url;
    }
  });

  LobbyManager.addCommandListener('lobby-deleted', () => {
    console.log('Lobby deletion command received');
    localStorage.clear();
    window.location.href = '/';
  });

  elements.leaveButton?.addEventListener('click', () => {
    elements.modalMessage.textContent = isOwner ? 
      "Attention ! En quittant, le salon sera supprimé. Continuer ?" : 
      "Quitter le salon ?";
    elements.modal.style.display = 'flex';
  });

  elements.confirmButton?.addEventListener('click', async () => {
    console.log('Confirming lobby deletion');
    if (isOwner) await LobbyManager.sendCommand('lobby-deleted');
    await LobbyManager.leaveLobby();
    window.location.href = '/';
  });

  elements.cancelButton?.addEventListener('click', () => {
    elements.modal.style.display = 'none';
  });

  elements.startButton?.addEventListener('click', () => {
    console.log('Start button clicked - isOwner:', isOwner);
    if (isOwner) {
      console.log('Sending start-countdown command');
      LobbyManager.sendCommand('start-countdown', { duration: 5 })
        .then(success => console.log('Command success:', success))
        .catch(err => console.error('Command error:', err));
    }
  });

  elements.cancelCountdown?.addEventListener('click', () => {
    console.log('Cancel countdown clicked');
    if (isOwner) LobbyManager.sendCommand('cancel-countdown');
  });

  await checkLobbyState();
  setInterval(checkLobbyState, 2000);
});

window.addEventListener('beforeunload', () => {
  if (isOwner) {
    console.log('Sending lobby-deleted on unload');
    LobbyManager.sendCommand('lobby-deleted', {}, {
      priority: 'critical',
      persistent: false
    });
  }
});