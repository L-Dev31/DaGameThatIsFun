export const lobbyCommands = {
  "start-countdown": (payload) => {
    console.log("Démarrage du timer !");
    document.dispatchEvent(new CustomEvent("start-countdown", { detail: payload }));
  },
  "cancel-countdown": () => {
    console.log("Le timer a été annulé");
    document.dispatchEvent(new Event("cancel-countdown"));
  },
  "redirect": (payload) => {
    if (!window.location.href.includes(payload.url)) {
      console.log("Redirecting everyone to", payload.url);
      sessionStorage.setItem("isRedirecting", "true");
      window.location.href = payload.url;
    }
  },
  "lobby-deleted": (payload, manager) => {
    alert("Le salon a été supprimé par l'hôte !");
    localStorage.removeItem("roomCode");
    localStorage.removeItem("userId");
    if (manager) manager.stopPolling();
    window.location.href = "/";
  },
  "start-game": (payload, manager) => {}
};