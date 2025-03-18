#Permet de voir les lobby present (utile pour les devs)
import requests
import time
import os
from colorama import Fore, Style

def clear_screen():
    """
    Permet de nettoyer l'écran.
    Utilise 'cls' pour Windows et 'clear' pour les systèmes Unix (Linux/Mac).
    """
    os.system('cls' if os.name == 'nt' else 'clear')

def get_lobbys():
    """
    Récupère les données des lobbies via une requête HTTP.
    Envoie une requête GET à l'URL spécifiée et retourne les données sous forme de dictionnaire.
    """
    try:
        response = requests.get('http://127.0.0.1:8080/api/lobbies')
        if response.status_code == 200:
            # Si la réponse est réussie, retourne le contenu en format JSON
            return response.json()
        else:
            # Si la réponse n'est pas 200, on retourne un dictionnaire vide
            return {}
    except Exception as e:
        # En cas d'erreur de connexion, affiche un message d'erreur
        print(f"Erreur lors de la récupération des lobbies : {e}")
        return {}

def show_lobbys():
    """
    Affiche en boucle les lobbies disponibles, en mettant à jour l'écran toutes les 3 secondes.
    Appelle la fonction get_lobbys() pour obtenir la liste des lobbies et les afficher à l'écran.
    """
    while True:
        # Récupérer les lobbies via la fonction get_lobbys()
        lobbys = get_lobbys()
        clear_screen()  # Nettoyer l'écran avant de réafficher les lobbies

        # Vérifier si des lobbies sont présents dans la réponse
        if 'lobbies' in lobbys and len(lobbys['lobbies']) > 0:
            # Afficher les lobbies disponibles
            print(Fore.MAGENTA + "Lobbies ouverts :\n")
            for idx, lobby in enumerate(lobbys['lobbies'], start=1):
                # Extraire les informations des lobbies
                lobby_name = lobby['name']
                first_player_name = list(lobby['users'].values())[0]['name']  # Le nom du premier joueur
                user_count = len(lobby['users'])  # Nombre d'utilisateurs dans le lobby
                lobby_code = lobby['code']  # Code du lobby
                password = lobby.get('password', None)  # Mot de passe du lobby (s'il existe)

                # Afficher les détails du lobby
                print(Fore.CYAN + f"{idx}. {lobby_name}")
                print(Fore.WHITE + f"   Code: {lobby_code} | Hôte: {first_player_name}")
                print(Fore.WHITE + f"   Utilisateurs: {user_count}/8")
                
                # Si le lobby a un mot de passe, l'afficher en jaune
                if password:
                    print(Fore.YELLOW + f"   Mot de passe: {password}")
                
                print()
        else:
            # Si aucun lobby n'est disponible afficher un message d'erreur en rouge
            print(Fore.RED + "Aucun lobby disponible pour le moment.\n")

        # Réinitialiser les couleurs
        print(Style.RESET_ALL)
        # Attendre 3 secondes avant de rafraîchir l'affichage
        time.sleep(3)

if __name__ == "__main__":
    # Lancer la fonction pour afficher les lobbies
    show_lobbys()
