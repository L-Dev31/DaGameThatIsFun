// lobby_manager.js

class LobbyManager {
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
                currentUser: data.users[userId]
            };
        } catch (error) {
            console.error('Lobby fetch error:', error);
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
                    body: JSON.stringify({ userId })
                });
            } catch (error) {
                console.error('Leave lobby error:', error);
            }
        }
        
        localStorage.removeItem('roomCode');
        localStorage.removeItem('userId');
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
                        timestamp: Date.now()
                    })
                });
            } catch (error) {
                console.error('Command send error:', error);
            }
        }
    }

    static async getActivePlayers() {
        const lobby = await this.getCurrentLobby();
        
        if (lobby) {
            return Object.values(lobby.users).map(user => ({
                id: user.id,
                name: user.name,
                avatar: `/static/images/avatar/${user.avatar_index + 1}.png`,
                isOwner: user.id === lobby.owner
            }));
        }
        
        // Fallback to fake players if no lobby
        return Array.from({ length: 8 }, (_, i) => ({
            id: `bot_${i}`,
            name: `Joueur ${i + 1}`,
            avatar: `/static/images/avatar/${(i % 8) + 1}.png`,
            isBot: true
        }));
    }
}

export default LobbyManager;