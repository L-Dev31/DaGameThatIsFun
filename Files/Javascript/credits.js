import LobbyManager from './lobby_manager.js';
import { shouldRedirect, automaticRedirect } from './lobby_redirection.js';

const roomCode = new URLSearchParams(window.location.search).get('roomCode');

async function checkLobbyStatus() {
    const lobby = await LobbyManager.getCurrentLobby();
    if (lobby) {
        console.log("[CREDITS] L'utilisateur est dans un lobby: ", lobby);
    } else {
        console.log("[CREDITS] L'utilisateur n'est pas dans un lobby.");
        playersContainer.style.display = "none";
    }
}

checkLobbyStatus();

let isOwner = false;
let lastCommandTime = 0;
const backButton = document.querySelector('.action-button');
const playersContainer = document.getElementById("playersContainer");

async function updatePlayers() {
    const players = await LobbyManager.getActivePlayers();
    if (players.length === 0 && localStorage.getItem('roomCode')) {
        localStorage.removeItem('roomCode');
        localStorage.removeItem('userId');
        window.location.reload();
        return;
    }
    playersContainer.innerHTML = "";
    players.forEach(player => {
        const playerDiv = document.createElement("div");
        playerDiv.classList.add("player");
        playerDiv.innerHTML = `
            <img src="${player.avatar}" alt="${player.name}" class="player-avatar">
            <span class="player-name">${player.name}${player.isCurrentUser ? ' (Vous)' : ''}${player.isOwner ? ' 👑' : ''}</span>
        `;
        playersContainer.appendChild(playerDiv);
    });
}

backButton.onclick = async () => {
    const lobby = await LobbyManager.getCurrentLobby();
    if (lobby && lobby.isOwner) {
        console.log("[CREDITS] Owner redirige tout le monde vers l'index.");
        await LobbyManager.sendCommandToPlayers('redirect', { 
            url: `index.html?roomCode=${roomCode}` 
        });
    }
    window.location.href = roomCode ? `index.html?roomCode=${roomCode}` : 'index.html';
};

function setupCommandListener() {
    setInterval(async () => {
        const lobby = await LobbyManager.getCurrentLobby();
        const command = lobby?.latest_command;
        
        if (command?.timestamp > lastCommandTime) {
            lastCommandTime = command.timestamp;
            if (command.command === 'redirect' && shouldRedirect(command.payload.url)) {
                window.location.href = command.payload.url;
            }
        }
    }, 1000);
}

window.addEventListener('beforeunload', async () => {
    if (isOwner) {
        await LobbyManager.sendCommandToPlayers('lobby-deleted');
        await LobbyManager.leaveLobby();
    }
});

LobbyManager.init();
setupCommandListener();
setInterval(updatePlayers, 5000);
updatePlayers();