import os
import time
import threading
import webbrowser
from colorama import Fore, Style, init
import subprocess

init(autoreset=True)

def run_rust_server():
    subprocess.run(["cargo", "run", "--release"], check=True)

if __name__ == "__main__":
    print(Fore.GREEN + "✅ Démarrage du serveur Rust...")
    
    rust_thread = threading.Thread(target=run_rust_server, daemon=True)
    rust_thread.start()
    
    time.sleep(2)  # Attente du démarrage du serveur
    
    print(Fore.GREEN + "✅ Serveur Rust lancé sur le port 31.")
    webbrowser.open("http://localhost:31")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(Fore.RED + "\n⛔ Arrêt du serveur...")