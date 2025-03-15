export function execute(payload, context) {
    console.log('[COUNTDOWN] Démarrage avec payload:', payload);
    
    if (!context.isOwner) {
      console.error('Seul l\'owner peut démarrer le compte à rebours');
      return;
    }
  
    const overlay = document.getElementById('countdownOverlay');
    const display = document.getElementById('countdownNumber');
    
    if (!overlay || !display) {
      console.error('Éléments introuvables');
      return;
    }
  
    let duration = payload.duration;
    overlay.style.display = 'flex';
    display.textContent = duration;
  
    const interval = setInterval(() => {
      duration--;
      display.textContent = duration;
      
      if (duration <= 0) {
        clearInterval(interval);
        overlay.style.display = 'none';
        LobbyManager.sendCommand('redirect', { url: `/game?room=${context.roomCode}` });
      }
    }, 1000);
  
    window.__countdownInterval = interval;
  }