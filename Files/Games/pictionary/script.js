// État du jeu
let gameState = 'draw'; // Toujours en mode dessin par défaut
let isDrawing = false;
let currentTool = 'pen';
let currentSize = 'medium';
let currentPath = [];
let pathHistory = [];
let redoStack = [];
let lastX, lastY;

// Tailles de pinceau
const brushSizes = {
    small: 3,
    medium: 6,
    large: 12
};

// Configuration du canvas
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let canvasRect;

// Ajuster la taille du canvas
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    canvasRect = canvas.getBoundingClientRect();
    redrawCanvas(); // Redessiner après redimensionnement
}

// Initialisation
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupDrawingTools();
    setupChat();
    startTimer();
    updateGameState();

    // Ajout des gestionnaires d'événements tactiles
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
}

// Gestionnaires d'événements tactiles
function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    startDrawing(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    draw(mouseEvent);
}

// Fonction pour obtenir les coordonnées relatives au canvas
function getCanvasPosition(e) {
    const rect = canvasRect;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Gestionnaires du dessin
function startDrawing(e) {
    if (gameState !== 'draw') return;
    
    isDrawing = true;
    const pos = getCanvasPosition(e);
    lastX = pos.x;
    lastY = pos.y;
    
    currentPath = [{
        x: pos.x,
        y: pos.y,
        tool: currentTool,
        size: brushSizes[currentSize]
    }];

    // Commencer un nouveau chemin
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
    if (!isDrawing || gameState !== 'draw') return;
    
    const pos = getCanvasPosition(e);
    
    // Ajouter le point au chemin actuel
    currentPath.push({
        x: pos.x,
        y: pos.y,
        tool: currentTool,
        size: brushSizes[currentSize]
    });

    // Dessiner une ligne lisse
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = currentTool === 'eraser' ? 'white' : 'black';
    ctx.lineWidth = brushSizes[currentSize];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
}

function stopDrawing() {
    if (!isDrawing) return;
    
    isDrawing = false;
    if (currentPath.length > 0) {
        pathHistory.push(currentPath);
        redoStack = []; // Vider la pile redo après un nouveau dessin
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    pathHistory.forEach(path => {
        if (path.length < 2) return;
        
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.strokeStyle = path[0].tool === 'eraser' ? 'white' : 'black';
        ctx.lineWidth = path[0].size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    });
}

function undo() {
    if (pathHistory.length > 0) {
        redoStack.push(pathHistory.pop());
        redrawCanvas();
    }
}

function redo() {
    if (redoStack.length > 0) {
        pathHistory.push(redoStack.pop());
        redrawCanvas();
    }
}

// Configuration des outils de dessin
function setupDrawingTools() {
    const tools = document.querySelectorAll('.tool-button');
    const sizeButtons = document.querySelectorAll('.size-button');
    
    tools.forEach(tool => {
        tool.addEventListener('click', () => {
            tools.forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            currentTool = tool.id.replace('Tool', '');
        });
    });

    sizeButtons.forEach(button => {
        button.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentSize = button.dataset.size;
        });
    });

    // Événements de dessin
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Événements undo/redo
    document.getElementById('undoTool').addEventListener('click', undo);
    document.getElementById('redoTool').addEventListener('click', redo);
}

// Fonctions de base pour le chat
function setupChat() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            addMessage(chatInput.value);
            chatInput.value = '';
        }
    });
}

function addMessage(text) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.textContent = text;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Timer basique
function startTimer() {
    let timeLeft = 30;
    const timerElement = document.getElementById('timer');
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            addMessage("⏰ Temps écoulé !");
        }
    }, 1000);
}

// Mise à jour de l'état du jeu
function updateGameState() {
    const drawingTools = document.getElementById('drawingTools');
    const chatInput = document.getElementById('chatInput');
    const wordDisplay = document.getElementById('wordDisplay');
    const chatSection = document.querySelector('.chat-section');
    const drawingSection = document.querySelector('.drawing-section');

    if (gameState === 'draw') {
        drawingTools.classList.remove('hidden');
        chatInput.disabled = true;
        chatInput.placeholder = "Vous êtes en train de dessiner...";
        wordDisplay.classList.remove('hidden');
        chatSection.style.filter = "brightness(0.8)";
        drawingSection.style.filter = "brightness(1)";
    } else {
        drawingTools.classList.add('hidden');
        chatInput.disabled = false;
        chatInput.placeholder = "Une idée ? Écris-la vite !";
        wordDisplay.classList.add('hidden');
        chatSection.style.filter = "brightness(1)";
    }
}

// Démarrer l'application
window.addEventListener('load', init);