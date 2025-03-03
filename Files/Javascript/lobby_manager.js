// static/js/lobby_manager.js
class LobbyManager {
    static currentLobby = null;
    static currentUser = null;
    static pendingActions = new Set();

    static init() {
        this.currentUser = {
            id: localStorage.getItem('userId'),
            name: localStorage.getItem('playerName'),
            avatarIndex: parseInt(localStorage.getItem('avatarIndex')) || 0,
            isOwner: localStorage.getItem('isOwner') === 'true'
        };
        
        this.currentLobby = {
            code: localStorage.getItem('roomCode'),
            players: []
        };

        this.injectStyles();
        this.startPolling();
        this.renderPlayerList();
    }

    static injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .lobby-players-container {
                position: fixed;
                bottom: 20px;
                left: 20px;
                background: rgba(0,0,0,0.7);
                padding: 15px;
                border-radius: 10px;
                backdrop-filter: blur(5px);
                z-index: 1000;
            }
            .lobby-player {
                display: flex;
                align-items: center;
                margin: 10px 0;
                color: white;
            }
            .lobby-player img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                margin-right: 10px;
                border: 2px solid transparent;
            }
            .lobby-player.current img {
                border-color: #00ff00;
            }
        `;
        document.head.appendChild(style);
    }

    static async fetchLobby() {
        if (!this.currentLobby.code) return;
        
        try {
            const response = await fetch(`/api/lobby/${this.currentLobby.code}`);
            const data = await response.json();
            this.currentLobby.players = Object.values(data.users);
            this.currentUser.isOwner = data.owner === this.currentUser.id;
            this.renderPlayerList();
        } catch (error) {
            this.clearSession();
        }
    }

    static async sendAction(action, payload) {
        if (!this.currentUser.isOwner) return;

        await fetch(`/api/lobby/${this.currentLobby.code}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload, timestamp: Date.now() })
        });
    }

    static startPolling() {
        setInterval(async () => {
            if (!this.currentLobby.code) return;
            
            try {
                const response = await fetch(`/api/lobby/${this.currentLobby.code}/actions`);
                const actions = await response.json();
                
                actions.forEach(({ action, payload, timestamp }) => {
                    if (!this.pendingActions.has(timestamp)) {
                        this.handleAction(action, payload);
                        this.pendingActions.add(timestamp);
                    }
                });
            } catch (error) {
                console.error('Polling error:', error);
            }
            
            this.fetchLobby();
        }, 1000);
    }

    static handleAction(action, payload) {
        switch (action) {
            case 'start_timer':
                this.showTimer(payload.duration);
                break;
            case 'redirect':
                window.location.href = payload.url;
                break;
        }
    }

    static showTimer(duration) {
        const event = new CustomEvent('lobby-timer', { 
            detail: { duration, isOwner: this.currentUser.isOwner } 
        });
        document.dispatchEvent(event);
    }

    static renderPlayerList() {
        let container = document.querySelector('.lobby-players-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'lobby-players-container';
            document.body.appendChild(container);
        }
        
        container.innerHTML = this.currentLobby.players.map(player => `
            <div class="lobby-player ${player.id === this.currentUser.id ? 'current' : ''}">
                <img src="/static/images/avatar/${player.avatar_index + 1}.png" alt="${player.name}">
                <span>${player.name}${player.id === this.currentLobby.owner ? ' 👑' : ''}</span>
            </div>
        `).join('');
    }

    static clearSession() {
        localStorage.removeItem('userId');
        localStorage.removeItem('roomCode');
        localStorage.removeItem('isOwner');
        window.location.href = '/';
    }
}

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => LobbyManager.init());
export default LobbyManager;