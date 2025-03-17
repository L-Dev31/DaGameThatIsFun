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
  static init() {
    if (localStorage.getItem('roomCode')) {
      this.startPolling();
    }
    this._setupUnloadListener();
  }
  static _setupUnloadListener() {
    window.addEventListener('beforeunload', () => {
      const isRedirecting = sessionStorage.getItem('isRedirecting');
      const roomCode = localStorage.getItem('roomCode');
      const userId = localStorage.getItem('userId');
      if (!isRedirecting && roomCode && userId) {
        const data = { userId };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(`/api/lobby/${roomCode}/leave`, blob);
      }
      sessionStorage.removeItem('isRedirecting');
    });
  }
  static async getActivePlayers() {
    const userId = localStorage.getItem('userId');
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
      } else {
        this.stopPolling();
        return;
      }
    } catch (error) {
      this._errorCount++;
      if (this._errorCount >= this._MAX_ERRORS) {
        this.stopPolling();
        return;
      }
      this._currentPollInterval = Math.min(
        this._currentPollInterval * this.POLL_BACKOFF_FACTOR,
        this.MAX_POLL_INTERVAL
      );
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
  static async getCurrentLobby() {
    const roomCode = localStorage.getItem('roomCode');
    const userId = localStorage.getItem('userId');
    if (!roomCode || !userId) return null;
    try {
      const response = await fetch(`/api/lobby/${roomCode}`);
      if (!response.ok) {
        if (response.status === 404) {
          localStorage.removeItem('roomCode');
          localStorage.removeItem('userId');
          this.stopPolling();
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
  static async isCurrentUserOwner() {
    const lobby = await this.getCurrentLobby();
    return lobby?.isOwner || false;
  }
  static async leaveLobby() {
    const roomCode = localStorage.getItem('roomCode');
    const userId = localStorage.getItem('userId');
    if (roomCode && userId) {
      try {
        await fetch(`/api/lobby/${roomCode}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      } catch (error) {}
    }
    localStorage.removeItem('roomCode');
    localStorage.removeItem('userId');
    this.stopPolling();
  }
  static async sendCommandToPlayers(command, payload = {}) {
    const roomCode = localStorage.getItem('roomCode');
    const lobby = await this.getCurrentLobby();
    if (lobby?.isOwner) {
      try {
        const commandData = {
          command,
          initiator: localStorage.getItem('userId'),
          payload,
          timestamp: Date.now()
        };
        await fetch(`/api/lobby/${roomCode}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commandData)
        });
        if (lobbyCommands[command]) {
          lobbyCommands[command](payload, this);
        }
      } catch (error) {
        console.error("[LOBBY_MANAGER] Erreur lors de l'envoi de la commande:", error);
      }
    }
  }
  static async startGame(gameUrl) {
    const roomCode = localStorage.getItem('roomCode');
    const lobby = await this.getCurrentLobby();
    if (lobby?.isOwner) {
      try {
        await fetch(`/api/lobby/${roomCode}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'start-game',
            initiator: localStorage.getItem('userId'),
            payload: { gameUrl },
            timestamp: Date.now()
          })
        });
      } catch (error) {}
    }
  }
  static setupCommandListener() {
    let lastCommandTime = 0;
    setInterval(async () => {
      try {
        const lobby = await this.getCurrentLobby();
        const command = lobby?.latest_command;
        if (command && command.timestamp > lastCommandTime) {
          lastCommandTime = command.timestamp;
          if (lobbyCommands[command.command]) {
            lobbyCommands[command.command](command.payload, this);
          }
        }
      } catch (err) {}
    }, 1000);
  }
}
export default LobbyManager;