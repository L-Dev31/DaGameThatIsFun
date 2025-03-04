# Permet de generer un lien/qrcode pour faire rejoindre plus facilement d'autres joueurs
import socket
import qrcode
import base64
import io
import threading

_qr_cache = {}
_cache_lock = threading.Lock()

# Récupère l'ip locale
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(0)
    try:
        s.connect(('10.254.254.254', 1))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

# Génère le QRCode
def generate_qr_code(ip, port):
    with _cache_lock:
        if (ip, port) in _qr_cache:
            return _qr_cache[(ip, port)]
        
        url = f'http://{ip}:{port}'
        qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        
        buffered = io.BytesIO()
        qr.make_image(fill='black', back_color='white').save(buffered, format="PNG")
        result = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        _qr_cache[(ip, port)] = result
        return result