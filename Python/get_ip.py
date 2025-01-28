import tkinter as tk
import socket
import qrcode
from PIL import ImageTk, Image

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

def generate_qr_code(ip, port):
    url = f'http://{ip}:{port}'
    qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_L, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    
    # Créer une image du QR code avec la couleur noire par défaut
    img = qr.make_image(fill='black', back_color='white')

    # Changer la couleur noire à #a855f7 (couleur violet)
    img = img.convert("RGBA")
    pixels = img.load()
    for i in range(img.width):
        for j in range(img.height):
            if pixels[i, j] == (0, 0, 0, 255):  # Pixels noirs
                pixels[i, j] = (168, 85, 247, 255)  # Changer la couleur en #a855f7

    return img

def create_gui():
    ip = get_local_ip()
    port = 8000

    root = tk.Tk()
    root.title("URL & QR Code")
    root.configure(bg='#ffffff')
    
    # Définir l'icône de l'application (favicon)
    root.iconbitmap('Files/static/images/favicon/favicon.ico')
    
    label_ip = tk.Label(root, text=f"URL à entrer sur le navigateur:\n https://{ip}:{port}", font=("Helvetica", 14), fg="#a855f7", bg="#ffffff")
    label_ip.pack(pady=10)

    qr_code = generate_qr_code(ip, port)
    qr_code_image = ImageTk.PhotoImage(qr_code)

    label_qr = tk.Label(root, image=qr_code_image, bg="#ffffff")
    label_qr.image = qr_code_image
    label_qr.pack(pady=15)

    root.mainloop()

if __name__ == "__main__":
    create_gui()
