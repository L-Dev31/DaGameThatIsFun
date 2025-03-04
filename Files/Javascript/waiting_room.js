// waiting_room.js - Gestion de la salle d'attente du lobby

import LobbyManager from './lobby_manager.js';

let isOwner = false;
const userId = localStorage.getItem('userId');
const roomCode = localStorage.getItem('roomCode');

if (!roomCode || !userId) {
  window.location.href = document.referrer || '/';
}

const modal = document.getElementById('confirmationModal');
const leaveButton = document.getElementById('leaveButton');
const cancelButton = document.getElementById('cancelButton');
const confirmButton = document.getElementById('confirmButton');
const modalMessage = document.getElementById('modalMessage');

function showModal(message, ownerLeaving = false) {
  modalMessage.textContent = message;
  modal.style.display = 'flex';
  confirmButton.onclick = async () => {
    if (ownerLeaving) {
      await LobbyManager.sendCommandToPlayers('lobby-deleted');
      await LobbyManager.leaveLobby();
      window.location.href = '/';
    } else {
      await LobbyManager.leaveLobby();
      window.location.href = '/';
    }
  };
}

function hideModal() {
  modal.style.display = 'none';
}

leaveButton.addEventListener('click', () => {
  const message = isOwner 
    ? "Attention ! En quittant, le salon sera supprimé. Continuer ?" 
    : "Quitter le salon ?";
  showModal(message, isOwner);
});
cancelButton.addEventListener('click', hideModal);
modal.addEventListener('click', (e) => { if (e.target === modal) hideModal(); });

function updatePlayersGrid(users, ownerId) {
  const playersGrid = document.getElementById('playersGrid');
  playersGrid.innerHTML = '';
  const currentUserId = localStorage.getItem('userId');
  const sortedUsers = Object.values(users).sort((a, b) => {
    if (a.id === ownerId) return -1;
    if (b.id === ownerId) return 1;
    return a.join_time - b.join_time;
  });
  for (let i = 0; i < 8; i++) {
    const playerSlot = document.createElement('div');
    playerSlot.classList.add('player-slot');
    if (i < sortedUsers.length) {
      const user = sortedUsers[i];
      playerSlot.innerHTML = `
        <div class="player-avatar${user.id === currentUserId ? ' current-player' : ''}">
          <img src="/static/images/avatar/${user.avatar_index + 1}.png" alt="${user.name}">
        </div>
        <span class="waiting-text">
          <strong>${user.name}</strong>
          ${user.id === ownerId ? ' 👑' : ''}
          ${user.id === currentUserId ? ' (Vous)' : ''}
        </span>`;
    } else {
      playerSlot.innerHTML = `
        <div class="player-avatar empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </div>
        <span class="waiting-text">En attente...</span>`;
    }
    playersGrid.appendChild(playerSlot);
  }
}

function updateStartButton(userCount, maxPlayers) {
  const startButton = document.getElementById('startButton');
  startButton.textContent = `Lancer la partie (${userCount}/${maxPlayers})`;
  startButton.disabled = !isOwner || userCount < 2;
}

let countdownInterval;
function startCountdown(duration) {
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownNumber = document.getElementById('countdownNumber');
  const cancelCountdown = document.getElementById('cancelCountdown');
  countdownOverlay.style.display = 'flex';
  let counter = duration;
  cancelCountdown.style.display = isOwner ? 'block' : 'none';
  countdownNumber.textContent = counter;
  countdownInterval = setInterval(() => {
    counter--;
    if (counter < 0) counter = 0;
    countdownNumber.textContent = counter;
    if (counter <= 0) {
      clearInterval(countdownInterval);
      // L'owner envoie la commande de redirection, mais tous les joueurs doivent déjà avoir lancé le compte à rebours via la commande reçue
      LobbyManager.sendCommandToPlayers('redirect', { url: `index.html?roomCode=${roomCode}` });
      window.location.href = `index.html?roomCode=${roomCode}`;
    }
  }, 1000);
}

function cancelCountdownGlobal() {
  clearInterval(countdownInterval);
  document.getElementById('countdownOverlay').style.display = 'none';
}

function setupCommandListener() {
  let lastCommandTime = 0;
  setInterval(async () => {
    const lobby = await LobbyManager.getCurrentLobby();
    const command = lobby?.latest_command;
    if (command && command.timestamp > lastCommandTime) {
      lastCommandTime = command.timestamp;
      console.log("Commande reçue :", command);
      switch (command.command) {
        case 'start-countdown':
          startCountdown(command.payload.duration);
          break;
        case 'cancel-countdown':
          cancelCountdownGlobal();
          break;
        case 'redirect':
          window.location.href = command.payload.url;
          break;
        case 'lobby-deleted':
          alert('Le salon a été supprimé par l\'hôte !');
          window.location.href = '/';
          break;
        case 'return-to-waiting':
          window.location.href = `waiting_room.html?roomCode=${roomCode}`;
          break;
      }
    }
  }, 1000);
}

async function checkOwnerStatus() {
  const lobby = await LobbyManager.getCurrentLobby();
  if (!lobby) {
    window.location.href = '/';
    return;
  }
  isOwner = lobby.isOwner;
  updatePlayersGrid(lobby.users, lobby.owner);
  updateStartButton(Object.keys(lobby.users).length, lobby.max_players || 8);
}

async function handleCountdown() {
  if (!isOwner) return;
  console.log("Déclenchement du compte à rebours...");
  await LobbyManager.sendCommandToPlayers('start-countdown', { duration: 5 });
  startCountdown(5);
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('roomCode').textContent = roomCode;
  await checkOwnerStatus();
  setupCommandListener();
  setInterval(checkOwnerStatus, 1000);
  document.getElementById('startButton').addEventListener('click', () => {
    if (isOwner) handleCountdown();
  });
});

window.addEventListener('beforeunload', async () => {
  if (isOwner) {
    const redirectData = JSON.stringify({ command: 'redirect', payload: { url: `index.html?roomCode=${roomCode}` } });
    navigator.sendBeacon('/api/send-command', redirectData);
  }
});
