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
  static _processedCommandIds = new Set(); // Pour suivre les commandes déjà traitées

  static init(startPollingAutomatically = true) {
    if (localStorage.getItem("roomCode")) {
      this.startPolling();
      this.setupCommandListener();
    }
    this._setupUnloadListener();
    this.checkLobbyStatusAndHandleUI();
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

  static _pollLobby() {
    try {
      const roomCode = localStorage.getItem("roomCode");
      const userId = localStorage.getItem("userId");
      const currentPage = sessionStorage.getItem('currentPage');
      
      if (!roomCode || !userId) {
        this.stopPolling();
        return;
      }
      
      // Augmenter l'intervalle de polling sur la page quiz-rush pour réduire la charge
      if (currentPage === 'quiz-rush') {
        this._currentPollInterval = Math.max(this._currentPollInterval, 2000); // Minimum 2 secondes sur quiz-rush
      }
      
      fetch(`/api/lobby/${roomCode}?userId=${userId}`, {
        // Ajouter un cache-buster pour éviter les problèmes de cache
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Ajouter un timeout pour éviter les requêtes bloquantes
        signal: AbortSignal.timeout(5000)
      })
        .then(response => {
          if (!response.ok) {
            if (response.status === 404) {
              localStorage.removeItem("roomCode");
              localStorage.removeItem("userId");
              this.stopPolling();
              
              // Ne pas afficher l'alerte si on est sur la page quiz-rush
              if (currentPage !== 'quiz-rush') {
                this.showLobbyDeletedAlert();
              }
              
              document.dispatchEvent(new CustomEvent("lobby-status", { 
                detail: { inLobby: false } 
              }));
            }
            throw new Error('Lobby not found');
          }
          return response.json();
        })
        .then(data => {
          this._errorCount = 0;
          
          // Ne pas réduire l'intervalle sur quiz-rush pour éviter trop de requêtes
          if (currentPage !== 'quiz-rush') {
            this._currentPollInterval = this.POLL_INTERVAL;
          }
          
          const lobby = {
            ...data,
            isOwner: data.owner === userId,
            currentUser: data.users[userId]
          };
          
          this._notifyListeners(lobby);
          this.updatePlayers(lobby);
        })
        .catch(error => {
          console.error("[LOBBY] Error polling lobby:", error);
          
          // Sur la page quiz-rush, ne pas incrémenter le compteur d'erreurs
          // pour éviter d'atteindre MAX_ERRORS et d'arrêter le polling
          if (currentPage !== 'quiz-rush') {
            this._errorCount++;
          }
          
          if (this._errorCount >= this._MAX_ERRORS && currentPage !== 'quiz-rush') {
            this.stopPolling();
            return;
          }
          
          this._currentPollInterval = Math.min(
            this._currentPollInterval * this.POLL_BACKOFF_FACTOR, 
            this.MAX_POLL_INTERVAL
          );
        })
        .finally(() => {
          if (this._pollTimeout !== null) {
            this._pollTimeout = setTimeout(() => this._pollLobby(), this._currentPollInterval);
          }
        });
    } catch (error) {
      console.error("[LOBBY] Critical error in polling:", error);
      
      // Sur la page quiz-rush, ne pas incrémenter le compteur d'erreurs
      const currentPage = sessionStorage.getItem('currentPage');
      if (currentPage !== 'quiz-rush') {
        this._errorCount++;
      }
      
      if (this._errorCount >= this._MAX_ERRORS && currentPage !== 'quiz-rush') {
        this.stopPolling();
        return;
      }
      
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
    // Ne pas afficher l'alerte si on est sur la page quiz-rush
    if (sessionStorage.getItem('currentPage') === 'quiz-rush') {
      console.log("[LOBBY] Suppression de l'alerte sur la page quiz-rush pour éviter les boucles");
      return;
    }
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
    const userId = localStorage.getItem("userId");
    
    try {
      // Générer un ID unique pour cette commande
      const commandId = `${command}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const commandData = {
        command,
        initiator: userId,
        payload: {
          ...payload,
          commandId: commandId, // Ajouter l'ID unique dans le payload
          senderId: userId // Ajouter l'ID de l'expéditeur pour traçabilité
        },
        timestamp: Date.now()
      };
      
      // Exécuter la commande localement d'abord pour une réponse immédiate
      if (lobbyCommands[command]) {
        lobbyCommands[command](commandData.payload, this);
      }
      
      // Ajouter cette commande à la liste des commandes traitées
      this._processedCommandIds.add(commandId);
      
      // Envoyer la commande au serveur ensuite pour la propager aux autres joueurs
      await fetch(`/api/lobby/${roomCode}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commandData)
      });
      
    } catch (error) {
      console.error("[ERROR] Erreur lors de l'envoi de la commande:", error);
    }
  }

  static setupCommandListener() {
    setInterval(async () => {
      try {
        const lobby = await this.getCurrentLobby();
        const command = lobby?.latest_command;
        
        if (command && command.payload) {
          // Vérifier si cette commande a déjà été traitée par son ID unique
          const commandId = command.payload.commandId;
          
          // Si la commande a un ID et n'a pas encore été traitée, ou si elle n'a pas d'ID mais a un timestamp différent
          if ((commandId && !this._processedCommandIds.has(commandId)) || 
              (!commandId && command.timestamp !== this._lastProcessedCommand?.timestamp)) {
            
            // Marquer cette commande comme traitée
            if (commandId) {
              this._processedCommandIds.add(commandId);
            }
            
            this._lastProcessedCommand = command;
            
            // Exécuter la commande
            if (lobbyCommands[command.command]) {
              console.log(`[COMMAND] Exécution de la commande ${command.command} reçue de ${command.initiator}`);
              
              // Cas spécial pour start-game pour s'assurer que tous les joueurs voient le contenu du quiz
              if (command.command === 'start-game') {
                const quizContent = document.getElementById('quiz-content');
                if (quizContent) {
                  quizContent.style.display = 'block';
                  console.log("[COMMAND] Affichage du contenu du quiz");
                }
              }
              
              lobbyCommands[command.command](command.payload, this);
            }
          }
        }
      } catch (err) {
        console.error("[ERROR] Erreur dans le listener de commandes:", err);
      }
    }, 1000);
    
    // Nettoyer périodiquement les anciennes commandes traitées
    setInterval(() => {
      if (this._processedCommandIds.size > 100) {
        this._processedCommandIds.clear();
      }
    }, 60000); // Nettoyer toutes les minutes
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

        // Ne pas envoyer de commande de déconnexion si on est en train de rediriger
        if (!isRedirecting && roomCode && userId) {
          const data = { userId };
          const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
          navigator.sendBeacon(`/api/lobby/${roomCode}/leave`, blob);
          
          // Envoyer la commande lobby-deleted uniquement si on n'est pas en train de rediriger
          // et que l'utilisateur est l'owner
          const isOwner = await this.isCurrentUserOwner();
          if (isOwner) {
            await this.sendCommandToPlayers('lobby-deleted');
            await this.leaveLobby();
          }
        }

        sessionStorage.removeItem("isRedirecting");
      } catch (error) {}
    });
  }

  static automaticRedirect(url) {
    sessionStorage.setItem('isRedirecting', 'true');
    window.location.href = url;
  }
}

export { LobbyManager };
