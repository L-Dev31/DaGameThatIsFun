import LobbyManager from './lobby_manager.js';

function setupCommandListener() {
  let lastCommandTime = 0;

  setInterval(async () => {
    try {
      const lobby = await LobbyManager.getCurrentLobby();
      const command = lobby?.latest_command;
      
      if (command && command.timestamp > lastCommandTime) {
        lastCommandTime = command.timestamp;
        
        console.log("[LOBBY_REDIRECTION] Commande reçue :", command);
        switch (command.command) {
          case 'redirect':
            if (shouldRedirect(command.payload.url)) { 
              console.log(`Redirection vers ${command.payload.url}`);
              window.location.href = command.payload.url;
            }
            break;
          case 'lobby-deleted':
            console.log("Nettoyage du lobby...");
            localStorage.removeItem('roomCode');
            localStorage.removeItem('userId');
            LobbyManager.stopPolling();
            window.location.href = 'index.html';
            break;
        }
      }
    } catch (err) {
      console.error("Erreur de traitement :", err);
    }
  }, 1000);
}

export function automaticRedirect(url) {
  if (shouldRedirect(url)) {
    window.location.href = url;
  }
}

export function shouldRedirect(targetUrl) {
  const currentPath = window.location.pathname.split('/').pop();
  const targetPath = new URL(targetUrl, window.location.href).pathname.split('/').pop();
  return currentPath !== targetPath;
}

setupCommandListener();