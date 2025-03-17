export const lobbyCommands = {
    "start-countdown": (payload) => {
      document.dispatchEvent(new CustomEvent("start-countdown", { detail: payload }));
    },
    "cancel-countdown": () => {
      document.dispatchEvent(new Event("cancel-countdown"));
    },
    "redirect": (payload, manager) => {
      if (manager.shouldRedirect(payload.url)) {
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
  