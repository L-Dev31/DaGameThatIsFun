let currentWord = '';
let currentDrawerIndex = 0;
let fakePlayersIntervals = [];
let guessList = [];
let currentTimerInterval;
let isDrawing = false;
let currentTool = 'pen';
let currentSize = 'medium';
let pathHistory = [];
let redoStack = [];
let lastX, lastY;
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
let canvasRect;

const players = [
    { name: "Jean-Jaquelino", score: 0, avatar: '/static/images/avatar/1.png' },
    { name: "Lucette-Albert", score: 0, avatar: '/static/images/avatar/2.png' },
    { name: "George-Paulin", score: 0, avatar: '/static/images/avatar/3.png' },
    { name: "Bob XVII", score: 0, avatar: '/static/images/avatar/4.png' },
    { name: "L'Enclume", score: 0, avatar: '/static/images/avatar/5.png' },
    { name: "Jean-Paulon", score: 0, avatar: '/static/images/avatar/6.png' },
    { name: "⎍⋔ ⎍ ⏃⋔⟒", score: 0, avatar: '/static/images/avatar/7.png' },
    { name: "Bob", score: 0, avatar: '/static/images/avatar/8.png' }
];

document.addEventListener('DOMContentLoaded', async () => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    await fetchWords();
    setupDrawingTools();
    setupChat();
    startNewRound();
});

function initCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    canvasRect = canvas.getBoundingClientRect();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
}

function getCanvasPosition(e) {
    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    return {
        x: (e.clientX - canvasRect.left) * scaleX,
        y: (e.clientY - canvasRect.top) * scaleY
    };
}

function startDrawing(e) {
    if (currentDrawerIndex !== 0) return;
    isDrawing = true;
    const pos = getCanvasPosition(e);
    [lastX, lastY] = [pos.x, pos.y];
    currentPath = [{ x: lastX, y: lastY, tool: currentTool, size: currentSize }];
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
}

function draw(e) {
    if (!isDrawing || currentDrawerIndex !== 0) return;
    const pos = getCanvasPosition(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = currentTool === 'eraser' ? 'white' : 'black';
    ctx.lineWidth = brushSizes[currentSize];
    ctx.stroke();
    currentPath.push({ x: pos.x, y: pos.y, tool: currentTool, size: currentSize });
    [lastX, lastY] = [pos.x, pos.y];
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentPath.length > 0) {
        pathHistory.push(currentPath);
        redoStack = [];
    }
}

const brushSizes = { small: 3, medium: 6, large: 12 };

function setupDrawingTools() {
    document.querySelectorAll('.tool-button').forEach(tool => {
        tool.addEventListener('click', () => {
            document.querySelectorAll('.tool-button').forEach(t => t.classList.remove('active'));
            tool.classList.add('active');
            currentTool = tool.id.replace('Tool', '');
        });
    });

    document.querySelectorAll('.size-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.size-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentSize = button.dataset.size;
        });
    });

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    document.getElementById('undoTool').addEventListener('click', () => {
        if (pathHistory.length > 0) {
            redoStack.push(pathHistory.pop());
            redrawCanvas();
        }
    });

    document.getElementById('redoTool').addEventListener('click', () => {
        if (redoStack.length > 0) {
            pathHistory.push(redoStack.pop());
            redrawCanvas();
        }
    });
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
        ctx.lineWidth = brushSizes[path[0].size];
        ctx.stroke();
    });
}

function setupChat() {
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim() !== '') {
            // Autoriser tout le monde à envoyer des messages SAUF le dessinateur actuel
            if (players[currentDrawerIndex].name !== "Vous") {
                addMessage(chatInput.value, "Vous");
                checkGuess(chatInput.value, players[0]);
            }
            chatInput.value = '';
        }
    });
}

function addMessage(text, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.textContent = `${sender}: ${text}`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function fetchWords() {
    try {
        const response = await fetch('guess-list.json');
        guessList = await response.json();
    } catch (error) {
        console.error('Erreur de chargement des mots:', error);
        guessList = ['erreur'];
    }
}

async function startNewRound() {
    fakePlayersIntervals.forEach(clearInterval);
    fakePlayersIntervals = [];
    pathHistory = [];
    redrawCanvas();

    currentWord = guessList[Math.floor(Math.random() * guessList.length)];
    document.getElementById('wordDisplay').querySelector('span').textContent = currentWord;

    updateDrawerDisplay();
    updateGameState();

    startTimer(30);

    // Activer les faux joueurs POUR TOUS LES TOURS
    players.forEach((player, index) => {
        if (index !== currentDrawerIndex) {
            const interval = setInterval(() => {
                const guess = guessList[Math.floor(Math.random() * guessList.length)];
                addMessage(guess, player.name);
                checkGuess(guess, player);
            }, Math.random() * 3000 + 2000);
            fakePlayersIntervals.push(interval);
        }
    });
}

function updateDrawerDisplay() {
    const drawer = players[currentDrawerIndex];
    document.querySelector('.drawer-avatar').src = drawer.avatar;
    document.querySelector('.drawer-name').textContent = `${drawer.name} dessine...`;
    renderPlayers();
}

function renderPlayers() {
    const container = document.getElementById('players-container');
    container.innerHTML = players.map(player => `
        <div class="player ${players[currentDrawerIndex] === player ? 'current-drawer' : ''}">
            <img src="${player.avatar}" alt="${player.name}">
            <div class="player-info">
                <div class="player-name">${player.name}</div>
                <div class="player-score">${player.score}</div>
            </div>
        </div>
    `).join('');
}

function updateGameState() {
    const chatSection = document.querySelector('.chat-section');
    const isUserDrawer = players[currentDrawerIndex].name === "Jean-Jaquelino";

    // Styles du chat
    chatSection.classList.toggle('disabled', isUserDrawer);
    document.getElementById('chatInput').disabled = isUserDrawer;

    // Outils et mot à deviner
    document.getElementById('drawingTools').style.display = isUserDrawer ? 'flex' : 'none';
    document.getElementById('wordDisplay').style.display = isUserDrawer ? 'block' : 'none';
}

function checkGuess(guess, player = players[0]) {
    if (guess.toLowerCase() === currentWord.toLowerCase()) {
        player.score++;
        showPopup(`${player.name} a gagné !`, true);
        currentDrawerIndex = players.indexOf(player);
        startNewRound();
    }
}

function startTimer(seconds) {
    let timeLeft = seconds;
    const timerElement = document.getElementById('timer');

    if (currentTimerInterval) clearInterval(currentTimerInterval);

    currentTimerInterval = setInterval(() => {
        timerElement.textContent = --timeLeft;
        if (timeLeft <= 0) {
            clearInterval(currentTimerInterval);
            players[currentDrawerIndex].score = Math.max(0, players[currentDrawerIndex].score - 1);
            showPopup('Temps écoulé !', false);
            nextDrawer();
        }
    }, 1000);
}

function nextDrawer() {
    currentDrawerIndex = (currentDrawerIndex + 1) % players.length;
    startNewRound();
}

function showPopup(message, isWin) {
    const popup = document.createElement('div');
    popup.className = `popup ${isWin ? 'win' : 'lose'}`;
    popup.textContent = message;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
}