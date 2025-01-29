import threading
import time
import os
import webbrowser
from Python.models import cleanup_inactive_lobbies
from Python.server import run_server

if __name__ == "__main__":
    os.makedirs("Files", exist_ok=True)
    
    cleanup_thread = threading.Thread(target=cleanup_inactive_lobbies, daemon=True)
    cleanup_thread.start()
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    
    webbrowser.open(f"http://localhost:8000")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nArrêt du serveur...")