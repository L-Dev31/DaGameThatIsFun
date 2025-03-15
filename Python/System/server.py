import http.server
import socketserver
import ujson as json
import threading
import time
import logging
from System.models import LobbySession
from System.lobby import active_sessions, create_lobby, join_lobby, leave_lobby
from System.qr import get_local_ip, generate_qr_code

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('LobbyServer')

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
            try:
                post_data = json.loads(self.rfile.read(content_length).decode('utf-8'))
            except json.JSONDecodeError:
                self.send_error_response("Invalid JSON data")
                return
                
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
                    
                    # Enhanced permission check
                    initiator_id = post_data.get('initiator')
                    if initiator_id != lobby.owner and not post_data.get('bypass_owner_check', False):
                        self.send_error_response("Action non autorisée", 403)
                        return

                    # Enhanced command handling with acknowledgment system
                    command = post_data.get('command')
                    command_id = post_data.get('command_id', str(time.time()))
                    
                    # Store command in history for reliability
                    if not hasattr(lobby, 'command_history'):
                        lobby.command_history = {}
                    
                    # Add command to history with timestamp for reliable delivery
                    lobby.command_history[command_id] = {
                        'command': command,
                        'payload': post_data.get('payload'),
                        'timestamp': time.time(),
                        'initiator': initiator_id,
                        'acknowledged_by': set()
                    }
                    
                    # Handle special commands
                    if command == 'start-game':
                        lobby.latest_command = {
                            'command': 'redirect',
                            'command_id': command_id,
                            'payload': {
                                'url': post_data.get('payload').get('gameUrl'),
                                'force': True
                            },
                            'timestamp': time.time(),
                            'initiator': initiator_id
                        }
                    else:
                        # Update lobby state if provided
                        if command == 'redirect' and post_data.get('payload') and post_data.get('payload').get('newState'):
                            lobby.state = post_data.get('payload').get('newState')
                        
                        lobby.latest_command = {
                            'command': command,
                            'command_id': command_id,
                            'payload': post_data.get('payload'),
                            'timestamp': time.time(),
                            'initiator': initiator_id
                        }
                    
                    logger.info(f"Command '{command}' received for lobby {room_code}")
                self.send_json_response({'success': True, 'command_id': command_id})

            # New endpoint for command acknowledgment
            elif self.path.startswith('/api/lobby/') and self.path.endswith('/ack'):
                room_code = self.path.split('/')[-2]
                with active_sessions_lock:
                    if room_code not in active_sessions:
                        raise ValueError("Salon introuvable")
                    
                    lobby = active_sessions[room_code]
                    command_id = post_data.get('command_id')
                    user_id = post_data.get('user_id')
                    
                    if hasattr(lobby, 'command_history') and command_id in lobby.command_history:
                        lobby.command_history[command_id]['acknowledged_by'].add(user_id)
                        logger.info(f"Command {command_id} acknowledged by user {user_id}")
                        
                self.send_json_response({'success': True})

            else:
                self.send_error_response("Endpoint non trouvé", 404)
        except Exception as e:
            logger.error(f"Error in POST handler: {str(e)}", exc_info=True)
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
                        # Add command history status for monitoring
                        if hasattr(session, 'command_history'):
                            lobby_data['command_status'] = {
                                cmd_id: {
                                    'command': cmd['command'],
                                    'acknowledged_count': len(cmd['acknowledged_by']),
                                    'total_users': len(session.users)
                                } for cmd_id, cmd in session.command_history.items()
                            }
                        lobbies_data.append(lobby_data)
                self.send_json_response({'lobbies': lobbies_data})
            elif base_path.startswith('/api/lobby/') and len(base_path.split('/')) == 4:
                room_code = base_path.split('/')[-1]
                with active_sessions_lock:
                    if room_code in active_sessions:
                        lobby = active_sessions[room_code]
                        lobby_data = lobby.to_dict()
                        lobby_data['latest_command'] = getattr(lobby, 'latest_command', None)
                        # Include pending commands that need acknowledgment
                        if hasattr(lobby, 'command_history'):
                            lobby_data['pending_commands'] = [
                                {
                                    'command_id': cmd_id,
                                    'command': cmd['command'],
                                    'payload': cmd['payload'],
                                    'timestamp': cmd['timestamp']
                                } for cmd_id, cmd in lobby.command_history.items()
                            ]
                        self.send_json_response(lobby_data)
                    else:
                        self.send_error_response("Salon non trouvé", 404)
            else:
                super().do_GET()
        except Exception as e:
            logger.error(f"Error in GET handler: {str(e)}", exc_info=True)
            self.send_error_response(str(e))

    def do_DELETE(self):
        if self.path.startswith('/api/lobby/delete/'):
            room_code = self.path.split('/')[-1]
            with active_sessions_lock:
                if room_code in active_sessions:
                    # Notify all players before deleting
                    lobby = active_sessions[room_code]
                    lobby.latest_command = {
                        'command': 'lobby-deleted',
                        'timestamp': time.time(),
                        'initiator': 'system'
                    }
                    # Give clients a chance to receive the notification
                    time.sleep(0.5)
                    del active_sessions[room_code]
                    self.send_json_response({'success': True})
                else:
                    self.send_error_response("Le salon n'existe pas", 404)
        else:
            self.send_error_response("Endpoint non trouvé", 404)

def run_server():
    try:
        with socketserver.ThreadingTCPServer(("", PORT), LobbyHandler) as httpd:
            logger.info(f"Server started at port {PORT}")
            httpd.serve_forever()
    except Exception as e:
        logger.critical(f"Server failed to start: {str(e)}", exc_info=True)

if __name__ == "__main__":
    run_server()
