class LobbyManager {
    static POLL_INTERVAL = 5000; 
    static MAX_POLL_INTERVAL = 30000; 
    static POLL_BACKOFF_FACTOR = 1.5; 

    static _currentPollInterval = this.POLL_INTERVAL;
    static _pollTimeout = null;
    static _listeners = new Set();

    // Démarre le polling
    static startPolling() {
        this._pollLobby();
    }

    // Arrête le polling
    static stopPolling() {
        if (this._pollTimeout) {
            clearTimeout(this._pollTimeout);
            this._pollTimeout = null;
        }
    }

    // Ajoute un écouteur pour les mises à jour du lobby
    static addListener(callback) {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    // Méthode de polling intelligente
    static async _pollLobby() {
        try {
            const lobby = await this.getCurrentLobby();
            if (lobby) {
                // Réinitialise l'intervalle si des changements sont détectés
                this._currentPollInterval = this.POLL_INTERVAL;
                this._notifyListeners(lobby);
            } else {
                // Augmente l'intervalle si le lobby est inactif
                this._currentPollInterval = Math.min(
                    this._currentPollInterval * this.POLL_BACKOFF_FACTOR,
                    this.MAX_POLL_INTERVAL
                );
            }
        } catch (error) {
            console.error('Polling error:', error);
            this._currentPollInterval = this.MAX_POLL_INTERVAL;
        } finally {
            this._pollTimeout = setTimeout(() => this._pollLobby(), this._currentPollInterval);
        }
    }

    // Notifie tous les écouteurs
    static _notifyListeners(lobby) {
        for (const listener of this._listeners) {
            listener(lobby);
        }
    }

    // Récupère les informations du lobby actuel
    static async getCurrentLobby() {
        const roomCode = localStorage.getItem('roomCode');
        const userId = localStorage.getItem('userId');
        if (!roomCode || !userId) return null;
        try {
            const response = await fetch(`/api/lobby/${roomCode}`);
            if (!response.ok) throw new Error('Lobby not found');
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

    // Quitte le lobby
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

    // Envoie une commande aux joueurs
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
                        payload,
                        timestamp: Date.now(),
                    }),
                });
            } catch (error) {
                console.error('Command send error:', error);
            }
        }
    }

    // Récupère la liste des joueurs actifs
    static async getActivePlayers() {
        const lobby = await this.getCurrentLobby();
        if (lobby) {
            return Object.values(lobby.users).map((user) => ({
                id: user.id,
                name: user.name,
                avatar: `/static/images/avatar/${user.avatar_index + 1}.png`,
                isOwner: user.id === lobby.owner,
            }));
        }
        // Fallback en cas d'absence de lobby
        return Array.from({ length: 8 }, (_, i) => ({
            id: `bot_${i}`,
            name: `Joueur ${i + 1}`,
            avatar: `/static/images/avatar/${(i % 8) + 1}.png`,
            isBot: true,
        }));
    }
}

export default LobbyManager;
