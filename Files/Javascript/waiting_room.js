// Variables globales
let isOwner = false;
let currentUsers = {};
const userId = localStorage.getItem('userId');
const roomCode = localStorage.getItem('roomCode');

if (!roomCode || !userId) {
    window.location.href = document.referrer || '/';
}

// Gestion du modal de confirmation pour quitter le salon
const modal = document.getElementById('confirmationModal');
const leaveButton = document.getElementById('leaveButton');
const cancelButton = document.getElementById('cancelButton');
const confirmButton = document.getElementById('confirmButton');
const modalMessage = document.getElementById('modalMessage');

function showModal(message, isOwnerLeaving = false) {
    modalMessage.textContent = message;
    modal.classList.add('active');

    confirmButton.onclick = () => {
    if (isOwnerLeaving) {
        deleteLobby();
    } else {
        leaveLobby();
    }
    };
}

function hideModal() {
    modal.classList.remove('active');
}

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

    // Trier les utilisateurs : owner en premier, puis par join_time
    const sortedUsers = Object.values(users).sort((a, b) => {
    if (a.id === ownerId) return -1;
    if (b.id === ownerId) return 1;
    return a.join_time - b.join_time;
    });

    // Afficher les utilisateurs triés dans la grille
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
    startButton.textContent = `Lancer la partie (${userCount}/${maxPlayers})`;
    // Seul le propriétaire avec au moins 2 joueurs peut cliquer sur le bouton
    startButton.disabled = !isOwner || userCount < 2;
}

// Mise à jour du salon via l'API
function updateRoom() {
    fetch(`/api/lobby/${roomCode}`)
    .then(response => {
        if (!response.ok) throw new Error('Lobby not found');
        return response.json();
    })
    .then(data => {
        isOwner = data.owner === userId;
        currentUsers = data.users;
        updatePlayersGrid(data.users, data.owner);
        updateStartButton(Object.keys(data.users).length, 8);
    })
    .catch(err => {
        console.error('Erreur:', err);
        if (err.message === 'Lobby not found') {
        alert('Le salon n\'existe plus !');
        window.location.href = '/';
        }
    });
}

// Fonctions de gestion du lobby
async function leaveLobby() {
    try {
    await fetch(`/api/lobby/${roomCode}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    localStorage.clear();
    window.location.href = '/';
    } catch (err) {
    console.error('Erreur:', err);
    window.location.href = '/';
    }
}

async function deleteLobby() {
    try {
    await fetch(`/api/lobby/delete/${roomCode}`, { method: 'DELETE' });
    localStorage.clear();
    window.location.href = '/';
    } catch (err) {
    console.error('Erreur:', err);
    window.location.href = '/';
    }
}

// Gestion du décompte avec animation
const startButton = document.getElementById('startButton');
const countdownOverlay = document.getElementById('countdownOverlay');
const countdownNumber = document.getElementById('countdownNumber');
const cancelCountdown = document.getElementById('cancelCountdown');
let countdownInterval;

startButton.addEventListener('click', () => {
    // Ne rien faire si le bouton est désactivé (ce qui sera le cas pour les non-propriétaires)
    if (startButton.disabled) return;

    // Afficher l'overlay
    countdownOverlay.style.display = 'flex';
    let counter = 5;
    countdownNumber.textContent = counter;

    // Pour chaque chiffre, on recréera l'animation en réaffectant la classe
    countdownInterval = setInterval(() => {
    counter--;
    if (counter < 0) {
        clearInterval(countdownInterval);
        // Rediriger TOUS les joueurs vers index.html?lobby=CODE
        fetch(`/api/lobby/${roomCode}/start`, { method: 'POST' });
        window.location.href = `index.html?lobby=${roomCode}`;
    } else {
        // Remise à zéro de l'animation en retirant puis réappliquant la classe
        countdownNumber.textContent = counter;
        countdownNumber.classList.remove('countdown-number');
        // Forcer le reflow pour redémarrer l'animation
        void countdownNumber.offsetWidth;
        countdownNumber.classList.add('countdown-number');
    }
    }, 1000);
});

// Annuler le décompte si l'utilisateur clique sur "Annuler"
cancelCountdown.addEventListener('click', () => {
    clearInterval(countdownInterval);
    countdownOverlay.style.display = 'none';
});

// Initialisation au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('roomCode').textContent = roomCode;
    updateRoom();
    setInterval(updateRoom, 3000);
});

// Gestion de la déconnexion avant de quitter la page
window.addEventListener('beforeunload', () => {
    if (isOwner) deleteLobby();
    else leaveLobby();
});