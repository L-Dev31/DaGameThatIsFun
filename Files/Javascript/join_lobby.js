import { avatars } from '/Javascript/avatar.js';
        
let currentAvatarIndex = 0;

const updateAvatar = () => {
    document.getElementById('avatarImage').src = avatars[currentAvatarIndex].image;
    document.getElementById('avatarName').textContent = avatars[currentAvatarIndex].name;
};

document.getElementById('prevAvatar').addEventListener('click', () => {
    currentAvatarIndex = (currentAvatarIndex - 1 + avatars.length) % avatars.length;
    updateAvatar();
});

document.getElementById('nextAvatar').addEventListener('click', () => {
    currentAvatarIndex = (currentAvatarIndex + 1) % avatars.length;
    updateAvatar();
});

updateAvatar();

const loadLobbies = async () => {
    try {
        console.log("[JOIN] Chargement des salons disponibles...");
        const response = await fetch(`/api/lobbies?_=${Date.now()}`);
        const { lobbies } = await response.json();
        const lobbyList = document.getElementById('lobbyList');
        
        const activeLobbies = lobbies
            .filter(lobby => lobby?.users && lobby.state !== "in_game" && Object.keys(lobby.users).length < (lobby.max_players || 8))
            .reverse();

        lobbyList.innerHTML = activeLobbies.length > 0 ? activeLobbies.map(lobby => `
            <div class="lobby-item" data-code="${lobby.code}">
                ${lobby.hasPassword ? '<div class="lock-icon">🔒</div>' : ''}
                <div class="lobby-info">
                    <span>${lobby.name}</span>
                    <span class="lobby-info-more">${Object.keys(lobby.users).length} joueurs | Code: ${lobby.code}</span>
                </div>
            </div>
        `).join('') : '<div class="no-lobbies">Aucun salon public</div>';

        document.querySelectorAll('.lobby-item').forEach(element => {
            element.addEventListener('click', async () => {
                const roomCode = element.dataset.code;
                const playerName = document.getElementById('playerName').value.trim();
                if (!playerName) {
                    alert('Pseudonyme requis');
                    return;
                }
                try {
                    const checkResponse = await fetch(`/api/lobby/${roomCode}`);
                    const lobby = await checkResponse.json();
                    if (lobby.hasPassword) {
                        showPasswordModal(roomCode);
                    } else {
                        joinLobby(roomCode, null);
                    }
                } catch (error) {
                    alert('Erreur: ' + error.message);
                    loadLobbies();
                }
            });
        });
    } catch (error) {
        console.error("[JOIN] Erreur lors du chargement des salons:", error);
    }
};

function showPasswordModal(roomCode) {
    const modal = document.getElementById('passwordModal');
    const modalPassword = document.getElementById('modalPassword');
    modalPassword.value = '';
    modal.style.display = 'block';

    const submitHandler = () => {
        const password = modalPassword.value;
        modal.style.display = 'none';
        joinLobby(roomCode, password);
        document.getElementById('submitPassword').removeEventListener('click', submitHandler);
    };

    document.getElementById('submitPassword').addEventListener('click', submitHandler);

    modal.querySelector('.close').addEventListener('click', () => {
        modal.style.display = 'none';
        document.getElementById('submitPassword').removeEventListener('click', submitHandler);
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.getElementById('submitPassword').removeEventListener('click', submitHandler);
        }
    });
}

async function joinLobby(roomCode, password) {
    const playerName = document.getElementById('playerName').value.trim();
    const avatarIndex = currentAvatarIndex;
    try {
        console.log(`[JOIN] Tentative de rejoindre le salon ${roomCode} avec le pseudo "${playerName}".`);
        const response = await fetch('/api/lobby/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerName, roomCode, password, avatarIndex })
        });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Erreur lors de la connexion au salon');
        }
        const result = await response.json();
        localStorage.setItem('roomCode', roomCode);
        localStorage.setItem('userId', result.userId);
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('playerAvatarIndex', avatarIndex);
        console.log(`[JOIN] Salon rejoint avec succès. Redirection vers waiting_room.html?roomCode=${roomCode}`);
        window.location.href = `waiting_room.html?roomCode=${roomCode}`;
    } catch (error) {
        alert(error.message);
    }
}

document.getElementById('joinLobbyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomCode = document.getElementById('roomCode').value.toUpperCase().trim();
    await joinLobby(roomCode, null);
});

setInterval(loadLobbies, 5000);
loadLobbies();