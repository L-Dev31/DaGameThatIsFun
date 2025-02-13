# System/qr.py
import socket
import qrcode
import base64
import io

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

# System/qr.py
def generate_qr_code(ip, port):
    url = f'http://{ip}:{port}'
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    
    # Créer une image du QR code
    img = qr.make_image(fill='black', back_color='white')
    img = img.convert("RGBA")
    
    # Convertir l'image en base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")  # Retourne l'image en base64