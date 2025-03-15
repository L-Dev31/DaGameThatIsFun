import { preloadCurtains, showEndGameCurtains } from '/Games/general/credits.js';
import { players } from '/Games/general/players.js';

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
    let backgroundMusic;
    let currentPath = [];
    let backgroundMusicFadeInterval;
    let gameActive = true;
    let isPopupVisible = false;
    let isCreditsVisible = false;

    const brushSizes = { small: 3, medium: 6, large: 12 };

    preloadCurtains();

    function updateGameState() {
        const isUserDrawer = players[currentDrawerIndex].name === "Jean-Jaquelino";
        const isChatDisabled = isCreditsVisible || isPopupVisible || isUserDrawer; // Inversez la logique ici
        
        // Chat Section
        chatSection.style.filter = isChatDisabled ? "brightness(0.8)" : "brightness(1)";
        chatSection.style.pointerEvents = isChatDisabled ? 'none' : 'auto';
        
        // Drawing Tools
        document.getElementById('drawingTools').style.display = isUserDrawer ? 'flex' : 'none';
        document.getElementById('wordDisplay').style.display = isUserDrawer ? 'block' : 'none';
        canvas.style.pointerEvents = isUserDrawer ? 'auto' : 'none';
        
        // Input Chat
        chatInput.disabled = isChatDisabled;
    }

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
        if (isCreditsVisible || currentDrawerIndex !== 0 || !gameActive) return;
        isDrawing = true;
        const pos = getCanvasPosition(e);
        [lastX, lastY] = [pos.x, pos.y];
        currentPath = [{ x: lastX, y: lastY, tool: currentTool, size: currentSize }];
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
    }

    function draw(e) {
        if (isCreditsVisible || !isDrawing || currentDrawerIndex !== 0 || !gameActive) return;
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
            currentPath = [];
        }
    }

    function setupDrawingTools() {
        document.querySelectorAll('.tool-button').forEach(tool => {
            tool.addEventListener('click', () => {
                if (isCreditsVisible) return;
                document.querySelectorAll('.tool-button').forEach(t => t.classList.remove('active'));
                tool.classList.add('active');
                currentTool = tool.id.replace('Tool', '');
            });
        });

        document.querySelectorAll('.size-button').forEach(button => {
            button.addEventListener('click', () => {
                if (isCreditsVisible) return;
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
            if (isCreditsVisible) return;
            if (pathHistory.length > 0) {
                redoStack.push(pathHistory.pop());
                redrawCanvas();
            }
        });

        document.getElementById('redoTool').addEventListener('click', () => {
            if (isCreditsVisible) return;
            if (redoStack.length > 0) {
                pathHistory.push(redoStack.pop());
                redrawCanvas();
            }
        });
    }

    function redrawCanvas() {
        if (isCreditsVisible) return;
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
        chatInput.addEventListener('keypress', (e) => {
            if (isCreditsVisible || !gameActive) return;
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
        if (isCreditsVisible) return;
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

    startButton.addEventListener('click', () => {
        if (isCreditsVisible) return;
        startButton.classList.add('disappear');
        setTimeout(() => {
            startButton.style.display = 'none';
            addPlayersWithDelay();
            if (backgroundMusic) {
                backgroundMusic.play().catch(error => console.error("Erreur lors de la lecture de la musique :", error));
            }
        }, 500);
    });

    function addPlayersWithDelay() {
        if (isCreditsVisible) return;
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
        if (isCreditsVisible) return;
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
        if (isCreditsVisible) return;
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
                mainContainer.style.display = 'flex';
                setTimeout(() => {
                    mainContainer.style.opacity = 1;
                    drawingSection.style.opacity = 1;
                    chatSection.style.opacity = 1;
                    document.querySelectorAll('.player').forEach(player => {
                        player.style.animation = 'none';
                    });
                }, 0);
                startGame();
            }
        }, 1000);
    }

    function startGame() {
        if (isCreditsVisible) return;
        stopBackgroundMusic();
        initCanvas();
        setupDrawingTools();
        setupChat();
        fetchWords().then(() => startNewRound());
        backgroundMusic = new Audio('music/BG.mp3');
        backgroundMusic.loop = true;
        backgroundMusic.play().catch(error => console.error("Erreur lors de la lecture de la musique :", error));
    }

    function stopBackgroundMusic() {
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic.currentTime = 0;
        }
    }

    function startNewRound() {
        if (isCreditsVisible || !gameActive) return;
        fakePlayersIntervals.forEach(clearInterval);
        fakePlayersIntervals = [];
        pathHistory = [];
        redrawCanvas();
        currentWord = guessList[Math.floor(Math.random() * guessList.length)];
        document.getElementById('wordDisplay').querySelector('span').textContent = currentWord;
        updateDrawerDisplay();
        updateGameState();
        showDrawerPopup();
        players.forEach((player, index) => {
            if (index !== currentDrawerIndex) {
                const interval = setInterval(() => {
                    if (isCreditsVisible || !gameActive) return;
                    const guess = guessList[Math.floor(Math.random() * guessList.length)];
                    addMessage(guess, player.name);
                    checkGuess(guess, player);
                }, Math.random() * 3000 + 2000);
                fakePlayersIntervals.push(interval);
            }
        });
    }

    function updateDrawerDisplay() {
        if (isCreditsVisible) return;
        const drawer = players[currentDrawerIndex];
        document.querySelector('.drawer-avatar').src = drawer.avatar;
        document.querySelector('.drawer-name').textContent = `${drawer.name} dessine...`;
        renderPlayers();
    }

    function renderPlayers() {
        if (isCreditsVisible) return;
        playersContainer.innerHTML = players.map(player => 
            `<div class="player ${players[currentDrawerIndex] === player ? 'current-drawer' : ''}">
                <img src="${player.avatar}" alt="${player.name}">
                <div class="player-info">
                    <div class="player-name">${player.name}</div>
                    <div class="player-score">${player.score}</div>
                </div>
            </div>`
        ).join('');
    }

    function checkGuess(guess, player = players[0]) {
        if (isCreditsVisible || !gameActive) return;
        if (guess.toLowerCase() === currentWord.toLowerCase()) {
            player.score++;
            playersClicked++;
            if (playersClicked >= 10) {
                endGame();
                return;
            }
            currentDrawerIndex = players.indexOf(player);
            startNewRound();
        }
    }

    function endGame() {
        showEndGameCurtains(players);
        
        if (isCreditsVisible) return;
        isCreditsVisible = true;
        gameActive = false;
        fakePlayersIntervals.forEach(clearInterval);
        fakePlayersIntervals = [];
        clearInterval(currentTimerInterval);
        document.querySelectorAll('.popup-overlay, .drawer-popup').forEach(el => el.remove());
        if (backgroundMusic) {
            clearInterval(backgroundMusicFadeInterval);
            backgroundMusicFadeInterval = setInterval(() => {
                if (backgroundMusic.volume > 0.1) {
                    backgroundMusic.volume -= 0.1;
                } else {
                    backgroundMusic.volume = 0;
                    clearInterval(backgroundMusicFadeInterval);
                    backgroundMusic.pause();
                    backgroundMusic.currentTime = 0;
                }
            }, 100);
        }
        updateGameState();
    }

    function showDrawerPopup() {
        if (isCreditsVisible) return;
        isPopupVisible = true;
        updateGameState();
        const drawer = players[currentDrawerIndex];
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        const popup = document.createElement('div');
        popup.className = 'drawer-popup';
        popup.innerHTML = `
            <img src="${drawer.avatar}" alt="${drawer.name}">
            <div class="username">${drawer.name}</div>
            <div class="status">dessine...</div>
        `;
        document.body.appendChild(overlay);
        document.body.appendChild(popup);
        new Audio('/static/music/swoosh-1.mp3').play().catch(() => {});
        setTimeout(() => {
            new Audio('/static/music/swoosh-2.mp3').play().catch(() => {});
            popup.classList.add('slide-out');
            overlay.style.opacity = '0';
            setTimeout(() => {
                popup.remove();
                overlay.remove();
                isPopupVisible = false;
                updateGameState();
                startTimer(30);
            }, 500);
        }, 3000);
    }

    function startTimer(seconds) {
        if (isCreditsVisible) return;
        let timeLeft = seconds;
        const timerElement = document.getElementById('timer');
        if (currentTimerInterval) clearInterval(currentTimerInterval);
        currentTimerInterval = setInterval(() => {
            timerElement.textContent = --timeLeft;
            if (timeLeft <= 0) {
                clearInterval(currentTimerInterval);
                players[currentDrawerIndex].score = Math.max(0, players[currentDrawerIndex].score - 1);
                nextDrawer();
            }
        }, 1000);
    }

    function nextDrawer() {
        if (isCreditsVisible || !gameActive) return;
        currentDrawerIndex = (currentDrawerIndex + 1) % players.length;
        startNewRound();
    }

    function playPopSound() {
        if (isCreditsVisible) return;
        const selectSound = new Audio('/static/music/pop.mp3');
        selectSound.play().catch(error => console.error("Erreur son:", error));
    }
});