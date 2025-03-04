class LobbyManager {
    static POLL_INTERVAL = 5000; 
    static MAX_POLL_INTERVAL = 30000; 
    static POLL_BACKOFF_FACTOR = 1.5; 

    static _currentPollInterval = this.POLL_INTERVAL;
    static _pollTimeout = null;
    static _listeners = new Set();

    static startPolling() {
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
            this._currentPollInterval = this.MAX_POLL_INTERVAL;
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
                console.error('Lobby not found');
                // En waiting_room, on ne supprime pas les identifiants
                if (window.location.pathname !== "/waiting_room.html") {
                    localStorage.removeItem('roomCode');
                    localStorage.removeItem('userId');
                }
                return null;
            }
            const data = await response.json();
            return {
                ...data,
                isOwner: data.owner === userId,
                currentUser: data.users[userId],
            };
        } catch (error) {
            if (window.location.pathname === "/waiting_room.html") {
                console.warn('Lobby fetch error (waiting_room):', error);
            } else {
                console.error('Lobby fetch error:', error);
                localStorage.removeItem('roomCode');
                localStorage.removeItem('userId');
            }
            return null;
        }
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
        return Array.from({ length: 8 }, (_, i) => ({
            id: `bot_${i}`,
            name: `Joueur ${i + 1}`,
            avatar: `/static/images/avatar/${(i % 8) + 1}.png`,
            isBot: true,
        }));
    }
}

export default LobbyManager;
