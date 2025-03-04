import http.server
import socketserver
import ujson as json
import threading
import time
from System.models import LobbySession
from System.lobby import active_sessions, create_lobby, join_lobby, leave_lobby
from System.qr import get_local_ip, generate_qr_code

active_sessions_lock = threading.Lock()
PORT = 8080
DIRECTORY = "Files"

class LobbyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        if self.path.startswith('/api'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        else:
            self.send_header('Cache-Control', 'max-age=3600')
        super().end_headers()

    def send_json_response(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_response(self, message, status=400):
        self.send_json_response({'error': message, 'success': False}, status)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = {}
        if content_length > 0:
            post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
        client_ip = self.client_address[0]
        try:
            if self.path == '/api/lobby/create':
                response = create_lobby(
                    post_data.get('playerName'),
                    post_data.get('password'),
                    post_data.get('avatarIndex', 0),
                    post_data.get('maxPlayers', 8),
                    client_ip
                )
                self.send_json_response(response)

            elif self.path == '/api/lobby/join':
                response = join_lobby(
                    post_data.get('roomCode'),
                    post_data.get('playerName'),
                    post_data.get('password'),
                    post_data.get('avatarIndex', 0),
                    client_ip
                )
                self.send_json_response(response)

            elif self.path.startswith('/api/lobby/') and self.path.endswith('/leave'):
                room_code = self.path.split('/')[-2]
                response = leave_lobby(post_data.get('userId'), room_code)
                self.send_json_response(response)

            elif self.path.startswith('/api/lobby/') and self.path.endswith('/command'):
                room_code = self.path.split('/')[-2]
                with active_sessions_lock:
                    if room_code not in active_sessions:
                        raise ValueError("Salon introuvable")
                    lobby = active_sessions[room_code]
                    if post_data.get('initiator') != lobby.owner:
                        self.send_error_response("Action non autorisée", 403)
                        return

                    command = post_data.get('command')
                    if command == 'start-game':
                        lobby.latest_command = {
                            'command': 'redirect',
                            'payload': {
                                'url': post_data.get('payload').get('gameUrl'),
                                'force': True
                            },
                            'timestamp': time.time(),
                            'initiator': lobby.owner
                        }
                    else:
                        lobby.latest_command = {
                            'command': command,
                            'payload': post_data.get('payload'),
                            'timestamp': time.time(),
                            'initiator': lobby.owner
                        }
                self.send_json_response({'success': True})

            else:
                self.send_error_response("Endpoint non trouvé", 404)
        except Exception as e:
            self.send_error_response(str(e))

    def do_GET(self):
        try:
            base_path = self.path.split('?')[0]
            if base_path == '/get_ip':
                ip = get_local_ip()
                qr_code = generate_qr_code(ip, PORT)
                self.send_json_response({
                    "url": f"http://{ip}:{PORT}",
                    "qr_code": qr_code
                })
            elif base_path == '/api/lobbies':
                lobbies_data = []
                with active_sessions_lock:
                    for session in active_sessions.values():
                        lobby_data = session.to_dict()
                        lobby_data['latest_command'] = getattr(session, 'latest_command', None)
                        lobbies_data.append(lobby_data)
                self.send_json_response({'lobbies': lobbies_data})
            elif base_path.startswith('/api/lobby/') and len(base_path.split('/')) == 4:
                room_code = base_path.split('/')[-1]
                with active_sessions_lock:
                    if room_code in active_sessions:
                        lobby = active_sessions[room_code]
                        lobby_data = lobby.to_dict()
                        lobby_data['latest_command'] = getattr(lobby, 'latest_command', None)
                        self.send_json_response(lobby_data)
                    else:
                        self.send_error_response("Salon non trouvé", 404)
            else:
                super().do_GET()
        except Exception as e:
            self.send_error_response(str(e))

    def do_DELETE(self):
        if self.path.startswith('/api/lobby/delete/'):
            room_code = self.path.split('/')[-1]
            with active_sessions_lock:
                if room_code in active_sessions:
                    del active_sessions[room_code]
                    self.send_json_response({'success': True})
                else:
                    self.send_error_response("Le salon n'existe pas", 404)
        else:
            self.send_error_response("Endpoint non trouvé", 404)

def run_server():
    with socketserver.ThreadingTCPServer(("", PORT), LobbyHandler) as httpd:
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
