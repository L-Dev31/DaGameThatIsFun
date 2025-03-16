class LobbyManager {
  static POLL_INTERVAL = 1000;
  static MAX_POLL_INTERVAL = 30000;
  static POLL_BACKOFF_FACTOR = 1.5;
  static _currentPollInterval = this.POLL_INTERVAL;
  static _pollTimeout = null;
  static _listeners = new Set();
  static _commandListeners = new Map();
  static _errorCount = 0;
  static _MAX_ERRORS = 5;
  static _processedCommands = new Set();
  static _pendingCommands = [];
  static _commandList = {};
  static _persistentCommands = new Map();

  static async init() {
    await this.loadCommandList();
    if (localStorage.getItem('roomCode')) this.startPolling();
    this._setupUnloadListener();
    this._setupCommandProcessor();
  }

  static async loadCommandList() {
    try {
      const response = await fetch('/Javascript/command_list.json');
      if (response.ok) this._commandList = await response.json();
    } catch (error) {}
  }

  static _setupUnloadListener() {
    window.addEventListener('beforeunload', (event) => {
      const roomCode = localStorage.getItem('roomCode');
      const userId = localStorage.getItem('userId');
      if (!sessionStorage.getItem('isRedirecting') && roomCode && userId) {
        const blob = new Blob([JSON.stringify({ userId })], { type: 'application/json' });
        navigator.sendBeacon(`/api/lobby/${roomCode}/leave`, blob);
      }
      sessionStorage.removeItem('isRedirecting');
    });
  }

  static _setupCommandProcessor() {
    setInterval(() => {
      if (this._pendingCommands.length > 0) {
        const highPriority = this._pendingCommands.filter(cmd => cmd.priority === 'high');
        const nextCommand = highPriority.length > 0 ? highPriority[0] : this._pendingCommands[0];
        this._executeCommand(nextCommand);
        this._pendingCommands = this._pendingCommands.filter(cmd => cmd !== nextCommand);
      }
    }, 100);
  }

  static async _executeCommand(command) {
    const config = this._commandList[command.command] || {};
    if (!config.script) return;
    try {
      const script = await import(config.script);
      if (typeof script.execute === 'function') {
        script.execute(command.payload, {
          roomCode: localStorage.getItem('roomCode'),
          userId: localStorage.getItem('userId'),
          isOwner: await this.isCurrentUserOwner()
        });
      }
    } catch (error) {
      console.error(`Command execution failed: ${error}`);
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

  static addCommandListener(commandType, callback) {
    if (!this._commandListeners.has(commandType)) this._commandListeners.set(commandType, []);
    this._commandListeners.get(commandType).push(callback);
    return () => this._commandListeners.set(commandType, this._commandListeners.get(commandType).filter(l => l !== callback));
  }

  static async _pollLobby() {
    try {
      const lobby = await this.getCurrentLobby();
      if (lobby) {
        this._errorCount = 0;
        this._currentPollInterval = this.POLL_INTERVAL;
        this._notifyListeners(lobby);
        this._processCommands(lobby);
      } else this.stopPolling();
    } catch (error) {
      this._errorCount++;
      if (this._errorCount >= this._MAX_ERRORS) this.stopPolling();
      else this._currentPollInterval = Math.min(this._currentPollInterval * this.POLL_BACKOFF_FACTOR, this.MAX_POLL_INTERVAL);
    } finally {
      if (this._pollTimeout !== null) this._pollTimeout = setTimeout(() => this._pollLobby(), this._currentPollInterval);
    }
  }

  static _processCommands(lobby) {
    lobby.command_history?.forEach(cmd => {
      if (this._commandList[cmd.command]?.persistent) this._persistentCommands.set(cmd.id, cmd);
    });
    [lobby.latest_command, ...lobby.command_history || []].forEach(cmd => {
      if (cmd.id && !this._processedCommands.has(cmd.id)) {
        this._processedCommands.add(cmd.id);
        this._pendingCommands.push(cmd);
      }
    });
    if (this._processedCommands.size > 1000) {
      Array.from(this._processedCommands).slice(0, 500).forEach(id => this._processedCommands.delete(id));
    }
  }

  static _notifyListeners(lobby) {
    this._listeners.forEach(listener => listener(lobby));
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
      return await response.json();
    } catch (error) {
      return null;
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

  static async isCurrentUserOwner() {
    const lobby = await this.getCurrentLobby();
    return lobby?.owner === localStorage.getItem('userId');
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

  static async sendCommand(command, payload = {}, options = {}) {
    console.log('Attempting to send command:', command);
    const roomCode = localStorage.getItem('roomCode');
    const userId = localStorage.getItem('userId');
    const lobby = await this.getCurrentLobby();
    if (!this._commandList[command] && !lobby?.isOwner) return false;
    const config = this._commandList[command] || {};
    options.priority = options.priority || config.defaultPriority || 'normal';
    try {
      const commandData = {
        command,
        initiator: userId,
        payload,
        timestamp: Date.now(),
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        target: options.target || config.defaultTarget || 'all',
        priority: options.priority,
        persistent: options.persistent || config.persistent || false
      };
      const response = await fetch(`/api/lobby/${roomCode}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commandData)
      });
      console.log('Command send status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('Command send error:', error);
      return false;
    }
  }
}

export default LobbyManager;