document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById('start-button');
    const mainContainer = document.querySelector('.main-container');
    const playersContainer = document.getElementById('players-container');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const drawingSection = document.querySelector('.drawing-section');
    const chatSection = document.querySelector('.chat-section');
    let playersClicked = 0;
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

    const brushSizes = { small: 3, medium: 6, large: 12 };

    // Initialisation du canvas
    function initCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        canvasRect = canvas.getBoundingClientRect();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    // Gestion du dessin
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

    // Outils de dessin
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

    // Chat
    function setupChat() {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && chatInput.value.trim() !== '') {
                if (players[currentDrawerIndex].name !== "Jean-Jaquelino") {
                    addMessage(chatInput.value, "Vous");
                    checkGuess(chatInput.value, players[0]);
                }
                chatInput.value = '';
            }
        });
    }

    function addMessage(text, sender) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message';
        msgDiv.textContent = `${sender}: ${text}`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Mots à deviner
    async function fetchWords() {
        try {
            const response = await fetch('guess-list.json');
            guessList = await response.json();
        } catch (error) {
            console.error('Erreur de chargement des mots:', error);
            guessList = ['erreur'];
        }
    }

    // Démarrage du jeu
    startButton.addEventListener('click', () => {
        startButton.classList.add('disappear');
        setTimeout(() => {
            startButton.style.display = 'none';
            addPlayersWithDelay();
        }, 500);
    });

    function addPlayersWithDelay() {
        players.forEach((player, index) => {
            setTimeout(() => {
                addPlayerToContainer(player);
                playPopSound();
                if (index === players.length - 1) {
                    launchGameCountdown();
                }
            }, index * 1000); 
        });
    }

    function addPlayerToContainer(player) {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.innerHTML = `
            <img src="${player.avatar}" alt="${player.name}">
            <div class="player-info">
                <span class="player-name">${player.name}</span>
                <span class="player-score">${player.score}</span>
            </div>
        `;
        playersContainer.appendChild(playerDiv);
        
        void playerDiv.offsetWidth;
        
        playerDiv.style.animation = 'pop 0.4s ease-out forwards';
        
        playerDiv.addEventListener('animationend', () => {
            playerDiv.style.animation = 'none';
        });
    }

    function launchGameCountdown() {
        const countdownDiv = document.createElement('div');
        countdownDiv.id = 'countdown';
        countdownDiv.textContent = `Début dans 5...`;
        countdownDiv.classList.add('countdown');

        document.body.appendChild(countdownDiv);

        let countdown = 5;
        const countdownInterval = setInterval(() => {
            countdown--;
            countdownDiv.textContent = `Début dans ${countdown}...`;
            
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownDiv.remove();
                // Faire apparaître les sections de dessin et de chat
                mainContainer.style.display = 'flex';
                setTimeout(() => {
                    mainContainer.style.opacity = 1;
                    drawingSection.style.opacity = 1;
                    chatSection.style.opacity = 1;

                    // Désactiver les animations pour les joueurs
                    document.querySelectorAll('.player').forEach(player => {
                        player.style.animation = 'none';
                    });
                }, 0);
                startGame();
            }
        }, 1000);
    }

    function startGame() {
        initCanvas();
        setupDrawingTools();
        setupChat();
        fetchWords().then(() => startNewRound());
    }

    function startNewRound() {
        fakePlayersIntervals.forEach(clearInterval);
        fakePlayersIntervals = [];
        pathHistory = [];
        redrawCanvas();

        currentWord = guessList[Math.floor(Math.random() * guessList.length)];
        document.getElementById('wordDisplay').querySelector('span').textContent = currentWord;

        updateDrawerDisplay();
        updateGameState();

        startTimer(30);

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
        playersContainer.innerHTML = players.map(player => `
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
        const isUserDrawer = players[currentDrawerIndex].name === "Jean-Jaquelino";
        document.querySelector('.chat-section').classList.toggle('disabled', isUserDrawer);
        document.getElementById('chatInput').disabled = isUserDrawer;
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

    function playPopSound() {
        const selectSound = new Audio('/static/music/pop.mp3');
        selectSound.play().catch(error => console.error("Erreur son:", error));
    }
});