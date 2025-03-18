import os
import sys
from urllib.parse import unquote

def clean_path(path):
    """
    Nettoie et normalise un chemin de fichier.
    Gère les préfixes 'file:///' et les espaces dans les chemins.
    """
    # Supprimer le préfixe 'file:///' s'il est présent
    if path.startswith("file:///"):
        path = path[8:]  # On enlève "file:///"
    # Décoder les caractères encodés en URL (par exemple, %20 pour les espaces)
    path = unquote(path)
    # Normaliser les séparateurs de chemin pour une compatibilité multiplateforme
    path = os.path.normpath(path)
    return path

def process_files(file_paths):
    """
    Traite une liste de chemins de fichiers et écrit leur contenu dans le fichier prompt.txt.
    """
    # Ouvre le fichier 'prompt.txt' en mode ajout
    with open('prompt.txt', 'a', encoding='utf-8') as prompt_file:
        for file_path in file_paths:
            # Nettoyer le chemin du fichier
            file_path = clean_path(file_path.strip())
            
            # Vérifier si le fichier existe
            if not os.path.exists(file_path):
                print(f"Erreur : Le fichier '{file_path}' n'a pas été trouvé.")
                continue
            
            try:
                # Ouvrir le fichier en mode lecture et lire son contenu
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
            except Exception as e:
                print(f"Erreur lors de la lecture de {file_path}: {str(e)}")
                continue
            
            # Écrire le contenu du fichier dans prompt.txt
            prompt_file.write(f"[{file_path}]\n{content}\n\n")
            print(f"Ajouté : {file_path}")

def main():
    print("Glissez-déposez des fichiers ici ou tapez 'stop' pour terminer.")

    if len(sys.argv) > 1:
        # Les fichiers ont été glissés-déposés sur le script
        file_paths = sys.argv[1:]
        process_files(file_paths)
        print("Tous les fichiers ont été traités. Consultez prompt.txt pour les résultats.")
    else:
        # Mode interactif si aucun fichier n'est glissé
        while True:
            user_input = input("Chemin(s) de fichier (ou tapez 'stop'): ").strip()
            if user_input.lower() == 'stop':
                print("Processus arrêté. Consultez prompt.txt pour les résultats.")
                break
            
            # Séparer les chemins de fichiers multiples par des espaces
            file_paths = user_input.split()
            process_files(file_paths)

if __name__ == "__main__":
    main()