// waiting_room.js
import LobbyManager from './lobby_manager.js';

// Variables globales
let isOwner = false;
const userId = localStorage.getItem('userId');
const roomCode = localStorage.getItem('roomCode');

// Vérification des credentials
if (!roomCode || !userId) {
    window.location.href = document.referrer || '/';
}

// Gestion du modal de confirmation
const modal = document.getElementById('confirmationModal');
const leaveButton = document.getElementById('leaveButton');
const cancelButton = document.getElementById('cancelButton');
const confirmButton = document.getElementById('confirmButton');
const modalMessage = document.getElementById('modalMessage');

function showModal(message, isOwnerLeaving = false) {
    modalMessage.textContent = message;
    modal.classList.add('active');

    confirmButton.onclick = async () => {
        if (isOwnerLeaving) {
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
    modal.classList.remove('active');
}

// Évènements du modal
leaveButton.addEventListener('click', () => {
    const message = isOwner 
        ? "Attention ! Si vous quittez cette page, le salon sera supprimé. Êtes-vous sûr de vouloir continuer ?"
        : "Êtes-vous sûr de vouloir quitter le salon ?";
    showModal(message, isOwner);
});

cancelButton.addEventListener('click', hideModal);
modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
});

// Mise à jour de l'affichage des joueurs
function updatePlayersGrid(users, ownerId) {
    const playersGrid = document.getElementById('playersGrid');
    playersGrid.innerHTML = '';

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
                <div class="player-avatar${user.id === userId ? ' current-player' : ''}">
                    <img src="/static/images/avatar/${user.avatar_index + 1}.png" alt="${user.name}">
                </div>
                <span class="waiting-text">
                    <strong>${user.name}</strong>
                    ${user.id === ownerId ? ' 👑' : ''} 
                    ${user.id === userId ? ' (Vous)' : ''}
                </span>
            `;
        } else {
            playerSlot.innerHTML = `
                <div class="player-avatar empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
                <span class="waiting-text">En attente...</span>
            `;
        }
        playersGrid.appendChild(playerSlot);
    }
}

// Mise à jour du bouton de démarrage
function updateStartButton(userCount, maxPlayers) {
    const startButton = document.getElementById('startButton');
    const shouldDisable = !isOwner || userCount < 2;
    
    console.log('Bouton démarrage:', {
        estOwner: isOwner,
        joueurs: userCount,
        maxJoueurs: maxPlayers,
        desactive: shouldDisable
    });
    
    startButton.textContent = `Lancer la partie (${userCount}/${maxPlayers})`;
    startButton.disabled = shouldDisable;
}

// Gestion du décompte
let countdownInterval;

async function handleCountdown() {
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownNumber = document.getElementById('countdownNumber');
    const cancelCountdown = document.getElementById('cancelCountdown');

    // Envoyer la commande aux autres joueurs
    await LobbyManager.sendCommandToPlayers('start-countdown', { duration: 5 });
    
    countdownOverlay.style.display = 'flex';
    let counter = 5;
    
    const updateCountdown = () => {
        countdownNumber.textContent = counter;
        counter--;

        if (counter < 0) {
            clearInterval(countdownInterval);
            LobbyManager.sendCommandToPlayers('redirect', { url: `index.html?lobby=${roomCode}` });
            window.location.href = `index.html?lobby=${roomCode}`;
        }
    };

    // Seul l'owner peut annuler
    cancelCountdown.style.display = isOwner ? 'block' : 'none';
    
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

// Écoute des commandes
function setupCommandListener() {
    let lastCommandTime = 0;
    
    setInterval(async () => {
        const lobby = await LobbyManager.getCurrentLobby();
        const command = lobby?.latestCommand;

        if (command && command.timestamp > lastCommandTime) {
            lastCommandTime = command.timestamp;
            
            switch (command.command) {
                case 'start-countdown':
                    startGlobalCountdown(command.payload.duration);
                    break;
                    
                case 'cancel-countdown':
                    cancelGlobalCountdown();
                    break;
                    
                case 'redirect':
                    window.location.href = command.payload.url;
                    break;
                    
                case 'lobby-deleted':
                    alert('Le salon a été supprimé par l\'hôte !');
                    window.location.href = '/';
                    break;
            }
        }
    }, 1000);
}

// Gestion du décompte global
function startGlobalCountdown(duration) {
    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownNumber = document.getElementById('countdownNumber');
    const cancelCountdown = document.getElementById('cancelCountdown');

    countdownOverlay.style.display = 'flex';
    let counter = duration;
    
    countdownInterval = setInterval(() => {
        countdownNumber.textContent = counter;
        counter--;
        
        if (counter < 0) {
            clearInterval(countdownInterval);
            window.location.href = `index.html?lobby=${roomCode}`;
        }
    }, 1000);

    // Seul l'owner peut voir le bouton d'annulation
    cancelCountdown.style.display = isOwner ? 'block' : 'none';
}

function cancelGlobalCountdown() {
    clearInterval(countdownInterval);
    document.getElementById('countdownOverlay').style.display = 'none';
}

// Annulation du décompte
document.getElementById('cancelCountdown').addEventListener('click', async () => {
    if (isOwner) {
        await LobbyManager.sendCommandToPlayers('cancel-countdown');
        cancelGlobalCountdown();
    }
});

// Vérification du statut owner
async function checkOwnerStatus() {
    const lobby = await LobbyManager.getCurrentLobby();
    
    if (!lobby) {
        window.location.href = '/';
        return;
    }
    
    isOwner = lobby.isOwner;
    console.log('Owner status:', isOwner, 'Players:', Object.keys(lobby.users).length);
    
    updatePlayersGrid(lobby.users, lobby.owner);
    updateStartButton(
        Object.keys(lobby.users).length, 
        lobby.max_players || 8 // Fallback sécurisé
    );
}

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
    // Affichage initial
    document.getElementById('roomCode').textContent = roomCode;
    
    // Vérification immédiate
    await checkOwnerStatus();
    
    // Configuration des listeners
    setupCommandListener();
    
    // Rafraîchissement périodique (réduit à 1s)
    setInterval(checkOwnerStatus, 1000);

    // Gestion du démarrage
    document.getElementById('startButton').addEventListener('click', handleCountdown);
});

// Nettoyage avant déconnexion
window.addEventListener('beforeunload', async () => {
    if (isOwner) {
        await LobbyManager.sendCommandToPlayers('lobby-deleted');
    }
    await LobbyManager.leaveLobby();
});