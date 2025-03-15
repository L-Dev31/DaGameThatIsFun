export function execute() {
    console.log('Canceling countdown');
    const overlay = document.getElementById('countdownOverlay');
    
    if (overlay) {
      overlay.style.display = 'none';
    }
  
    if (window.__activeIntervals) {
      window.__activeIntervals.forEach(clearInterval);
      window.__activeIntervals = [];
      console.log('All active intervals cleared');
    }
  }