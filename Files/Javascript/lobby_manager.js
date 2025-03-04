// lobby_manager.js - Gestion du lobby côté client

class LobbyManager {
    static POLL_INTERVAL = 1000;
    static MAX_POLL_INTERVAL = 30000;
    static POLL_BACKOFF_FACTOR = 1.5;
    static _currentPollInterval = this.POLL_INTERVAL;
    static _pollTimeout = null;
    static _listeners = new Set();
  
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
          this._currentPollInterval = this.POLL_INTERVAL;
          this._notifyListeners(lobby);
        } else {
          console.error("Lobby not found, stopping polling.");
          this.stopPolling();
          return;
        }
      } catch (error) {
        console.error('Polling error:', error);
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
          console.error('Lobby not found');
          return null;
        }
        const data = await response.json();
        return {
          ...data,
          isOwner: data.owner === userId,
          currentUser: data.users[userId],
        };
      } catch (error) {
        console.error('Lobby fetch error:', error);
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
            body: JSON.stringify({ userId }),
          });
        } catch (error) {
          console.error('Leave lobby error:', error);
        }
      }
      localStorage.removeItem('roomCode');
      localStorage.removeItem('userId');
      this.stopPolling();
    }
  
    // Correction : Déplacer 'initiator' au niveau supérieur de l'objet JSON envoyé
    static async sendCommandToPlayers(command, payload = {}) {
      const roomCode = localStorage.getItem('roomCode');
      const lobby = await this.getCurrentLobby();
      if (lobby?.isOwner) {
        try {
          await fetch(`/api/lobby/${roomCode}/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command,
              initiator: localStorage.getItem('userId'),
              payload, // payload reste inchangé
              timestamp: Date.now(),
            }),
          });
        } catch (error) {
          console.error('Command send error:', error);
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
              timestamp: Date.now(),
            }),
          });
        } catch (error) {
          console.error('Start game error:', error);
        }
      }
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
  
    // Méthode init() pour démarrer le polling si un lobby existe
    static init() {
      if (localStorage.getItem('roomCode')) {
        this.startPolling();
      }
    }
  }
  
  export default LobbyManager;
  