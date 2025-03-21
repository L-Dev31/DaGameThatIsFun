import { lobbyCommands } from './lobby_commands.js';

class LobbyManager {
  static POLL_INTERVAL = 1000;
  static MAX_POLL_INTERVAL = 30000;
  static POLL_BACKOFF_FACTOR = 1.5;
  static _currentPollInterval = this.POLL_INTERVAL;
  static _pollTimeout = null;
  static _listeners = new Set();
  static _errorCount = 0;
  static _MAX_ERRORS = 5;
  static _lastProcessedCommand = null;

  static init() {
    if (localStorage.getItem("roomCode")) {
      this.startPolling();
      this.setupCommandListener();
    }
    this._setupUnloadListener();
    this.checkLobbyStatusAndHandleUI();
    this.setupListeners();
  }

  static async checkLobbyStatusAndHandleUI() {
    const roomCode = localStorage.getItem("roomCode");
  
    if (!roomCode) {
      const playersContainer = document.getElementById("playersContainer");
      if (playersContainer) playersContainer.style.display = "none";
      return;
    }
  
    const lobby = await this.getCurrentLobby();
    const playersContainer = document.getElementById("playersContainer");
  
    if (!lobby) {
      if (playersContainer) playersContainer.style.display = "none";
      localStorage.removeItem('roomCode');
      localStorage.removeItem('userId');
  
      if (!window.location.pathname.includes('index.html')) {
        window.location.href = 'index.html';
      }
    } else {
      if (playersContainer) playersContainer.style.display = "flex";
    }
  }

  static async getCurrentLobby() {
    const roomCode = localStorage.getItem("roomCode");
    const userId = localStorage.getItem("userId");
    if (!roomCode || !userId) return null;
    try {
      const response = await fetch(`/api/lobby/${roomCode}?userId=${userId}`);
      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem("roomCode");
          localStorage.removeItem("userId");
          this.stopPolling();
          this.showLobbyDeletedAlert();
        }
        return null;
      }
      const data = await response.json();
      return {
        ...data,
        isOwner: data.owner === userId,
        currentUser: data.users[userId]
      };
    } catch (error) {
      return null;
    }
  }

  static startPolling() {
    if (this._pollTimeout !== null) return;
    this._pollLobby();
  }

  static stopPolling() {
    if (this._pollTimeout) {
      clearTimeout(this._pollTimeout);
      this._pollTimeout = null;
    }
  }

  static addListener(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  static async _pollLobby() {
    try {
      const lobby = await this.getCurrentLobby();
      if (lobby) {
        this._errorCount = 0;
        this._currentPollInterval = this.POLL_INTERVAL;
        this._notifyListeners(lobby);
        this.updatePlayers(lobby);
      } else {
        localStorage.removeItem("roomCode");
        localStorage.removeItem("userId");
        this.stopPolling();
        
        this.showLobbyDeletedAlert();
        
        document.dispatchEvent(new CustomEvent("lobby-status", { 
          detail: { inLobby: false } 
        }));
        
        return;
      }
    } catch (error) {
      this._errorCount++;
      if (this._errorCount >= this._MAX_ERRORS) {
        this.stopPolling();
        return;
      }
      this._currentPollInterval = Math.min(this._currentPollInterval * this.POLL_BACKOFF_FACTOR, this.MAX_POLL_INTERVAL);
    } finally {
      if (this._pollTimeout !== null) {
        this._pollTimeout = setTimeout(() => this._pollLobby(), this._currentPollInterval);
      }
    }
  }

  static _notifyListeners(lobby) {
    for (const listener of this._listeners) {
      listener(lobby);
    }
  }

  static showLobbyDeletedAlert() {
    alert("Le lobby n'existe plus. Vous allez être redirigé vers la page d'accueil.");
    window.location.href = "index.html";
  }

  static async isCurrentUserOwner() {
    const lobby = await this.getCurrentLobby();
    return lobby?.isOwner || false;
  }

  static async leaveLobby() {
    const roomCode = localStorage.getItem("roomCode");
    const userId = localStorage.getItem("userId");
    if (roomCode && userId) {
      try {
        await fetch(`/api/lobby/${roomCode}/leave`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId })
        });
      } catch (error) {}
    }
    localStorage.removeItem("roomCode");
    localStorage.removeItem("userId");
    this.stopPolling();
  }

  static async sendCommandToPlayers(command, payload = {}) {
    const roomCode = localStorage.getItem("roomCode");
    const lobby = await this.getCurrentLobby();
    if (lobby?.isOwner) {
      try {
        const commandData = {
          command,
          initiator: localStorage.getItem("userId"),
          payload,
          timestamp: Date.now()
        };
        await fetch(`/api/lobby/${roomCode}/command`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commandData)
        });
        if (lobbyCommands[command]) {
          lobbyCommands[command](payload, this);
        }
      } catch (error) {}
    }
  }

  static setupCommandListener() {
    setInterval(async () => {
      try {
        const lobby = await this.getCurrentLobby();
        const command = lobby?.latest_command;
        if (command && command.timestamp !== this._lastProcessedCommand?.timestamp) {
          this._lastProcessedCommand = command;
          if (lobbyCommands[command.command]) {
            lobbyCommands[command.command](command.payload, this);
          }
        }
      } catch (err) {}
    }, 1000);
  }

  static async updatePlayers(lobby) {
    const players = Object.values(lobby.users)
      .sort((a, b) => a.join_time - b.join_time)
      .map((user) => ({
        id: user.id,
        name: user.name,
        avatar: `/static/images/avatar/${user.avatar_index + 1}.png`,
        isOwner: user.id === lobby.owner,
        isCurrentUser: user.id === localStorage.getItem("userId")
      }));
    
    document.dispatchEvent(new CustomEvent("lobby-players-updated", { detail: players }));
    this.renderPlayers(players);
  }

  static renderPlayers(players) {
    const playersContainer = document.getElementById("playersContainer");
    if (!playersContainer) return;

    if (players.length === 0 && localStorage.getItem("roomCode")) {
      document.dispatchEvent(new CustomEvent("lobby-status", { 
        detail: { inLobby: false } 
      }));
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

  static async getActivePlayers() {
    const userId = localStorage.getItem("userId");
    const lobby = await this.getCurrentLobby();
    if (lobby) {
      return Object.values(lobby.users)
        .sort((a, b) => a.join_time - b.join_time)
        .map((user) => ({
          id: user.id,
          name: user.name,
          avatar: `/static/images/avatar/${user.avatar_index + 1}.png`,
          isOwner: user.id === lobby.owner,
          isCurrentUser: user.id === userId
        }));
    }
    return [];
  }

  static _setupUnloadListener() {
    window.addEventListener('beforeunload', async () => {
      try {
        const isRedirecting = sessionStorage.getItem("isRedirecting");
        const roomCode = localStorage.getItem("roomCode");
        const userId = localStorage.getItem("userId");

        if (!isRedirecting && roomCode && userId) {
          const data = { userId };
          const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
          navigator.sendBeacon(`/api/lobby/${roomCode}/leave`, blob);
        }

        sessionStorage.removeItem("isRedirecting");

        const isOwner = await this.isCurrentUserOwner();
        if (isOwner) {
          await this.sendCommandToPlayers('lobby-deleted');
          await this.leaveLobby();
        }
      } catch (error) {}
    });
  }

  static automaticRedirect(url) {
    sessionStorage.setItem('isRedirecting', 'true');
    window.location.href = url;
  }

  static setupListeners() {
    document.addEventListener("lobby-status", (event) => {
      const { inLobby } = event.detail;
      if (!inLobby) {
        localStorage.removeItem("roomCode");
        localStorage.removeItem("userId");
        this.showLobbyDeletedAlert();
      }
    });
  }
}

export { LobbyManager };
