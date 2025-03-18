# Permet de générer un lien/QrCode pour faire rejoindre plus facilement d'autres joueurs
import socket
import qrcode
import base64
import io
import threading

# dictionnaire de cache pour stocker les QR codes générés
_qr_cache = {}
_cache_lock = threading.Lock()

def get_local_ip():
    """
    Cette fonction récupère l'adresse IP locale de la machine.
    Elle tente de se connecter à une adresse IP publique (non routable) pour obtenir l'IP locale.
    Si cela échoue, elle retourne l'adresse IP du pc par defaut (127.0.0.1).
    """
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)  # Créer un socket UDP
    s.settimeout(0)  # Aucun délai d'attente pour la connexion
    try:
        # Tentative de connexion à une adresse IP publique pour déterminer l'IP locale
        s.connect(('10.254.254.254', 1))
        ip = s.getsockname()[0]  # Obtenir l'IP locale
    except Exception:
        ip = '127.0.0.1'  # Si la tentative échoue, utiliser l'IP du pc par defaut
    finally:
        s.close()  # Fermer le socket
    return ip  # Retourner l'IP locale

# Génère le QR Code avec l'IP et le port
def generate_qr_code(ip, port):
    """
    Cette fonction génère un QR Code contenant l'URL de connexion pour un autre joueur,
    en utilisant l'adresse IP et le port spécifiés.
    Le QR Code est mis en cache pour éviter de le générer à chaque fois.
    """
    with _cache_lock:
        # Vérifier si le qrcode pour cette IP et ce port est déjà dans le cache
        if (ip, port) in _qr_cache:
            return _qr_cache[(ip, port)]
        
        # Créer l'URL avec l'IP et le port
        url = f'http://{ip}:{port}'
        # Créer un objet QRCode avec des paramètres définis
        qr = qrcode.QRCode(
            version=1,  # Taille du QR Code
            error_correction=qrcode.constants.ERROR_CORRECT_L,  # Niveau de correction d'erreurs
            box_size=10,  # Taille des cases du QR Code
            border=4  # Taille du bord du QR Code
        )
        # Ajouter l'url au QR-Code
        qr.add_data(url)
        qr.make(fit=True)  # Ajuster le QR-Code pour qu'il s'adapte à l'url

        # Créer une image du QR Code et la sauvegarder dans un buffer
        buffered = io.BytesIO()
        qr.make_image(fill='black', back_color='white').save(buffered, format="PNG")
        
        # Encoder l'image en base64 pour pouvoir la transmettre facilement
        result = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        # Sauvegarder le QR code dans le cache pour ne pas le régénérer à chaque fois
        _qr_cache[(ip, port)] = result
        return result  # Retourner le QR Code encodé en base64
