import os
import time
import threading
import webbrowser
from colorama import Fore, Style, init
from System.server import run_server
from System.utils import cleanup_inactive_lobbies
from System.lobby import active_sessions

init(autoreset=True)  # Active colorama

DIRECTORY = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Files"))

if __name__ == "__main__":
    print(Fore.GREEN + "✅ Dossier des fichiers statiques prêt.")

    cleanup_thread = threading.Thread(target=cleanup_inactive_lobbies, args=(active_sessions,), daemon=True)
    cleanup_thread.start()  # Nettoie les lobbys inactifs
    print(Fore.GREEN + "✅ Nettoyage des lobbys démarré.")

    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()  # Démarre le serveur
    print(Fore.GREEN + "✅ Serveur HTTP lancé sur le port 8000.")

    webbrowser.open(f"http://localhost:8000")  # Ouvre le navigateur
    print(Fore.GREEN + "\n✅ Navigateur ouvert.")

    print(Fore.CYAN + "\n======================================")
    print(Fore.CYAN + "Bienvenue sur DA GAME THAT IS FUN !")
    print(Fore.CYAN + "Appuyez sur " + Fore.YELLOW + "Ctrl+C" + Fore.CYAN + " pour arrêter.")
    print(Fore.CYAN + "======================================")

    try:
        while True:  # Boucle pour garder le serveur en vie
            time.sleep(1)
    except KeyboardInterrupt:
        print(Fore.RED + "\n⛔ Arrêt du serveur...")