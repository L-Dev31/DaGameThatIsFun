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
    console.log("[LOBBY_MANAGER] Initialisation...");
    if (localStorage.getItem('roomCode')) {
      this.startPolling();
    }
  }

  static async getActivePlayers() {
      console.log("[LOBBY_MANAGER] Récupération des joueurs actifs...");
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
    console.log("[LOBBY_MANAGER] Début du polling du lobby.");
    this._pollLobby();
  }

  static stopPolling() {
    if (this._pollTimeout) {
      clearTimeout(this._pollTimeout);
      this._pollTimeout = null;
      console.log("[LOBBY_MANAGER] Polling arrêté.");
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
        console.error("[LOBBY_MANAGER] Lobby introuvable, arrêt du polling.");
        this.stopPolling();
        return;
      }
    } catch (error) {
      this._errorCount++;
      console.error(`[LOBBY_MANAGER] Erreur lors du polling (${this._errorCount}/${this._MAX_ERRORS}):`, error);
      if (this._errorCount >= this._MAX_ERRORS) {
        console.error("[LOBBY_MANAGER] Nombre maximum d'erreurs atteint. Arrêt du polling.");
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
          console.error("[LOBBY_MANAGER] Lobby non trouvé (404). Nettoyage des données locales.");
          localStorage.removeItem('roomCode');
          localStorage.removeItem('userId');
          this.stopPolling();
        }
        return null;
      }
      const data = await response.json();
      console.log("[LOBBY_MANAGER] Lobby récupéré :", data);
      return {
        ...data,
        isOwner: data.owner === userId,
        currentUser: data.users[userId]
      };
    } catch (error) {
      console.error("[LOBBY_MANAGER] Erreur lors du fetch du lobby:", error);
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
        console.log("[LOBBY_MANAGER] Envoi de la requête pour quitter le lobby.");
        await fetch(`/api/lobby/${roomCode}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
      } catch (error) {
        console.error("[LOBBY_MANAGER] Erreur lors de la demande de sortie du lobby:", error);
      }
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
            console.log(`[LOBBY_MANAGER] Envoi de la commande '${command}' avec payload:`, payload);
            await fetch(`/api/lobby/${roomCode}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command,
                    initiator: localStorage.getItem('userId'),
                    payload,
                    timestamp: Date.now()
                })
            });
            console.log(`[LOBBY_MANAGER] Commande '${command}' envoyée avec succès.`);
        } catch (error) {
            console.error("[LOBBY_MANAGER] Erreur lors de l'envoi de la commande:", error);
        }
    } else {
        console.warn("[LOBBY_MANAGER] Seul l'owner peut envoyer des commandes.");
    }
  }


  static async startGame(gameUrl) {
    const roomCode = localStorage.getItem('roomCode');
    const lobby = await this.getCurrentLobby();
    if (lobby?.isOwner) {
      try {
        console.log("[LOBBY_MANAGER] Lancement de la partie avec l'URL:", gameUrl);
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
      } catch (error) {
        console.error("[LOBBY_MANAGER] Erreur lors du lancement de la partie:", error);
      }
    }
  }
}

export default LobbyManager;
