export const lobbyCommands = {
  "redirect": (payload, manager) => {
    if (!window.location.href.includes(payload.url)) {
      sessionStorage.setItem('isRedirecting', 'true');
      window.location.href = payload.url;
    }
  },
  "start-countdown": (payload) => {
    document.dispatchEvent(new CustomEvent("start-countdown", { detail: payload }));
  },
  "cancel-countdown": () => {
    document.dispatchEvent(new Event("cancel-countdown"));
  },
  "lobby-deleted": (payload, manager) => {
    alert("Le salon a été supprimé par l'hôte !");
    localStorage.removeItem("roomCode");
    localStorage.removeItem("userId");
    if (manager) manager.stopPolling();
    window.location.href = "/";
  },
  "show-video": (payload, manager) => {
    document.dispatchEvent(new Event('show-video-popup'));
  }
};
