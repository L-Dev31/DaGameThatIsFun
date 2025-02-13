# Permet de voir les serveurs actifs (utile pour les devs)
import requests
import time
import os
from colorama import Fore, Style

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def get_lobbys():
    try:
        response = requests.get('http://127.0.0.1:8000/api/lobbies')
        if response.status_code == 200:
            return response.json()
        else:
            return {}
    except Exception as e:
        print(f"Error fetching lobbies: {e}")
        return {}

def show_lobbys():
    while True:
        lobbys = get_lobbys()
        clear_screen()

        if 'lobbies' in lobbys and len(lobbys['lobbies']) > 0:
            print(Fore.MAGENTA + "Open Lobbies:\n")
            for idx, lobby in enumerate(lobbys['lobbies'], start=1):
                lobby_name = lobby['name']
                first_player_name = list(lobby['users'].values())[0]['name']
                user_count = len(lobby['users'])
                lobby_code = lobby['code']
                password = lobby.get('password', None)

                print(Fore.CYAN + f"{idx}. {lobby_name}")
                print(Fore.WHITE + f"   Code: {lobby_code} | Host: {first_player_name}")
                print(Fore.WHITE + f"   Users: {user_count}/8")
                
                if password:
                    print(Fore.YELLOW + f"   Password: {password}")
                
                print()
        else:
            print(Fore.RED + "No lobbies available at the moment.\n")

        print(Style.RESET_ALL)
        time.sleep(3)

if __name__ == "__main__":
    show_lobbys()
