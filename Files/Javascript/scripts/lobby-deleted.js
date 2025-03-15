export function execute() {
    console.log('Executing lobby deletion');
    localStorage.clear();
    alert('Le salon a été supprimé par son créateur !');
    window.location.href = '/';
  }