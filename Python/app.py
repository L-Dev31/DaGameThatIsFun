# Permet de faire le pont entre tous les codes du jeu 
import os
import time
import threading
import webbrowser
from colorama import init, Fore
from System.server import run_server
from System.utils import cleanup_inactive_lobbies
from System.lobby import active_sessions

# Initialiser colorama pour les couleurs dans le terminal
init(autoreset=True)

# Définir le répertoire où les fichiers statiques seront stocké
DIRECTORY = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Files"))

if __name__ == "__main__":
    # Vérifier si le dossier existe, sinon le créer
    if not os.path.exists(DIRECTORY):
        os.makedirs(DIRECTORY)
    print(Fore.GREEN + "✅ Dossier des fichiers statiques prêt.")

    # Créer un thread pour nettoyer les lobbys inactifs
    cleanup_thread = threading.Thread(
        target=cleanup_inactive_lobbies, 
        args=(active_sessions,),  
        daemon=True  # Exécution en arrière-plan, sans bloquer l'arrêt du programme
    )
    cleanup_thread.start()  # Démarrer le thread de nettoyage
    print(Fore.GREEN + "✅ Nettoyage des lobbys démarré.")

    # Créer un thread pour démarrer le serveur HTTP
    server_thread = threading.Thread(
        target=run_server,  
        daemon=True  # Exécution en arrière-plan
    )
    server_thread.start()  # Démarrer le serveur HTTP
    print(Fore.GREEN + "✅ Serveur HTTP lancé sur le port 8080.")

    # Ouvrir le navigateur par défaut pour accéder au serveur
    webbrowser.open("http://localhost:8080")
    print(Fore.GREEN + "\n✅ Navigateur ouvert.")
    
    # Affichage du message de bienvenue dans le terminal
    print(Fore.CYAN + "\n======================================")
    print(Fore.CYAN + "Bienvenue sur DA GAME THAT IS FUN !")
    print(Fore.CYAN + "Appuyez sur " + Fore.YELLOW + "Ctrl+C" + Fore.CYAN + " pour arrêter.")
    print(Fore.CYAN + "======================================")

    try:
        # Boucle infinie pour maintenir le programme en cours d'exécution
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        # Si l'utilisateur appuie sur Ctrl+C, arrêter le serveur
        print(Fore.RED + "\n⛔ Arrêt du serveur...")
#c'est chiant de faire les commentaire :/