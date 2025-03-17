export const lobbyCommands = {
    "start-countdown": (payload) => {
      console.log("%c[COMMAND] start-countdown appelée avec payload: " + JSON.stringify(payload), "color: green;");
      document.dispatchEvent(new CustomEvent("start-countdown", { detail: payload }));
      console.log("%c[COMMAND] start-countdown exécutée", "color: blue;");
    },
    "cancel-countdown": () => {
      console.log("%c[COMMAND] cancel-countdown appelée", "color: green;");
      document.dispatchEvent(new Event("cancel-countdown"));
      console.log("%c[COMMAND] cancel-countdown exécutée", "color: blue;");
    },
    "redirect": (payload) => {
    console.log("%c[COMMAND] redirect appelée avec payload: " + JSON.stringify(payload), "color: green;");
    sessionStorage.setItem("pendingRedirect", payload.url);
    console.log("%c[COMMAND] redirect exécutée: redirection vers " + payload.url, "color: blue;");
    window.location.href = payload.url;
    },
    "lobby-deleted": (payload, manager) => {
      console.log("%c[COMMAND] lobby-deleted appelée", "color: green;");
      alert("Le salon a été supprimé par l'hôte !");
      localStorage.removeItem("roomCode");
      localStorage.removeItem("userId");
      if (manager) manager.stopPolling();
      console.log("%c[COMMAND] lobby-deleted exécutée: redirection vers /", "color: blue;");
      window.location.href = "/";
    },
    "start-game": (payload, manager) => {
      console.log("%c[COMMAND] start-game appelée", "color: green;");
      // Ajoutez ici le code de démarrage de la partie si nécessaire
      console.log("%c[COMMAND] start-game exécutée", "color: blue;");
    }
  };
  