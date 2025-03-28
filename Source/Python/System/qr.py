import socket
import qrcode
import base64
import io
import threading
import re

_qr_cache = {}
_cache_lock = threading.Lock()

def get_local_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip):
                return ip
    except:
        pass
    try:
        hostname = socket.gethostname()
        ip_list = socket.gethostbyname_ex(hostname)[2]
        for ip in ip_list:
            if ip != '127.0.0.1' and re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip):
                return ip
    except:
        pass
    return '127.0.0.1'

def generate_qr_code(ip, port):
    with _cache_lock:
        if (ip, port) in _qr_cache:
            return _qr_cache[(ip, port)]
        
        url = f'http://{ip}:{port}'
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4
        )
        qr.add_data(url)
        qr.make(fit=True)

        buffered = io.BytesIO()
        qr.make_image(fill='black', back_color='white').save(buffered, format="PNG")
        result = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        _qr_cache[(ip, port)] = result
        return result