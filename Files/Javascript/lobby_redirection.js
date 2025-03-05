import LobbyManager from './lobby_manager.js';

// Nouvelle fonction pour éviter les redirections vers la même page
function shouldRedirect(targetUrl) {
  const currentPath = window.location.pathname.split('/').pop();
  const targetPath = targetUrl.split('?')[0]; // Ignore les query params
  return currentPath !== targetPath;
}

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
            if (shouldRedirect(command.payload.url)) { // Vérification ajoutée
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

// Nouvelle version de automaticRedirect avec vérification
export function automaticRedirect(url) {
  if (shouldRedirect(url)) {
    window.location.href = url;
  }
}

setupCommandListener();