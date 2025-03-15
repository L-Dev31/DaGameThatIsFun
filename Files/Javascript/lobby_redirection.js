import LobbyManager from './lobby_manager.js';

class LobbyRedirection {
  static _initialized = false;
  static _lastCommandTime = 0;
  static _commandHandlers = {
    'redirect': (payload, command) => LobbyRedirection._handleRedirect(payload, command),
    'lobby-deleted': () => LobbyRedirection._handleLobbyDeleted(),
    'game-state': (payload, command) => LobbyRedirection._handleGameState(payload, command)
  };

  static init() {
    if (this._initialized) return;
    this._setupCommandListeners();
    this._initialized = true;
    console.log("[LOBBY_REDIRECTION] Initialized");
  }

  static _setupCommandListeners() {
    Object.keys(this._commandHandlers).forEach(commandType => {
      LobbyManager.addCommandListener(commandType, (payload, command) => {
        if (command.timestamp > this._lastCommandTime) {
          this._lastCommandTime = command.timestamp;
          this._commandHandlers[commandType](payload, command);
        }
      });
    });
  }

  static _handleRedirect(payload, command) {
    if (payload.force || this.shouldRedirect(payload.url)) {
      console.log(`[LOBBY_REDIRECTION] Redirection vers ${payload.url}`);
      sessionStorage.setItem('isRedirecting', 'true');
      window.location.href = payload.url;
    }
  }

  static _handleLobbyDeleted() {
    console.log("[LOBBY_REDIRECTION] Lobby supprimé, nettoyage...");
    localStorage.removeItem('roomCode');
    localStorage.removeItem('userId');
    LobbyManager.stopPolling();
    window.location.href = 'index.html';
  }

  static _handleGameState(payload, command) {
    const event = new CustomEvent('gameStateUpdate', {
      detail: { state: payload, command: command }
    });
    window.dispatchEvent(event);
  }

  static automaticRedirect(url, force = false) {
    if (force || this.shouldRedirect(url)) {
      sessionStorage.setItem('isRedirecting', 'true');
      window.location.href = url;
    }
  }

  static shouldRedirect(targetUrl) {
    if (!targetUrl) return false;
    try {
      const currentPath = window.location.pathname.split('/').pop();
      const targetPath = new URL(targetUrl, window.location.href).pathname.split('/').pop();
      return currentPath !== targetPath;
    } catch (error) {
      console.error("[LOBBY_REDIRECTION] Error checking redirect:", error);
      return false;
    }
  }
}

LobbyRedirection.init();

export const automaticRedirect = LobbyRedirection.automaticRedirect.bind(LobbyRedirection);
export const shouldRedirect = LobbyRedirection.shouldRedirect.bind(LobbyRedirection);
export default LobbyRedirection;
