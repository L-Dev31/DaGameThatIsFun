import { LobbyManager } from '/Javascript/lobby_manager.js';
import { preloadCurtains, showEndGameCurtains } from '/Games/general/credits.js';

// Variables globales
let currentQuestionIndex = 0;
let usedQuestions = [];
let questionStartTime = null;
let players = [];
let isOwner = false;
let readyPlayers = [];
let scoredPlayers = new Set(); // Pour suivre les joueurs qui ont déjà reçu des points pour la question actuelle

document.addEventListener("DOMContentLoaded", async () => {
    sessionStorage.setItem('currentPage', 'quiz-rush');
    await LobbyManager.init();
    isOwner = await LobbyManager.isCurrentUserOwner();
    window.isOwner = isOwner;

    const realPlayers = await LobbyManager.getActivePlayers();
    players = realPlayers.map(player => ({
        id: player.id,
        name: player.name,
        score: 0,
        avatar: player.avatar,
        isOwner: player.isOwner,
        isCurrentUser: player.isCurrentUser
    }));
    window.players = players;

    setupEventListeners();
    renderPlayersWithReducedOpacity();
    preloadCurtains();
});

function setupEventListeners() {
    document.addEventListener('player-answer-updated', (event) => {
        const { playerId, answerIndex } = event.detail;
        const answerElement = document.querySelectorAll('.answer')[answerIndex];
        if (answerElement) {
            updatePlayerMarker(playerId, answerElement);
        }
    });

    document.addEventListener('lobby-players-updated', (event) => {
        players = event.detail.map(p => ({
            ...p,
            score: players.find(op => op.id === p.id)?.score || 0
        }));
        window.players = players;
        renderPlayersWithReducedOpacity();
    });

    document.addEventListener('player-ready', (event) => {
        if (!readyPlayers.includes(event.detail.playerId)) {
            readyPlayers.push(event.detail.playerId);
            renderPlayersWithReducedOpacity();
            if (readyPlayers.length === players.length) startGameCountdown();
        }
    });

    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.addEventListener('click', () => {
            const userId = localStorage.getItem("userId");
            LobbyManager.sendCommandToPlayers('player-ready', {
                playerId: userId,
                readyPlayers: [...readyPlayers, userId]
            });
            startButton.disabled = true;
        });
    }
}

function updatePlayerMarker(playerId, answerElement) {
    document.querySelectorAll(`.player-marker[data-player-id="${playerId}"]`).forEach(m => m.remove());
    
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const marker = document.createElement('img');
    marker.src = player.avatar;
    marker.className = 'player-marker';
    marker.dataset.playerId = playerId;
    answerElement.appendChild(marker);
    updateMarkerPositions(answerElement);
}

function renderPlayersWithReducedOpacity() {
    const container = document.getElementById('players-container');
    container.innerHTML = players.map(player => 
        `<div class="player" data-player-id="${player.id}" style="opacity:${readyPlayers.includes(player.id) ? 1 : 0.25}">
            <img src="${player.avatar}" alt="${player.name}">
            <div class="player-info">
                <span class="player-name">${player.isOwner ? '👑 ' : ''}${player.name}${player.isCurrentUser ? ' (Vous)' : ''}</span>
                <span class="player-score">${player.score}</span>
            </div>
        </div>`
    ).join('');
}

function startGameCountdown() {
    const countdownDiv = document.createElement('div');
    countdownDiv.id = 'countdown';
    Object.assign(countdownDiv.style, {
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', fontSize: '2em',
        color: 'white', zIndex: '1000'
    });
    document.body.appendChild(countdownDiv);

    let countdown = 5;
    const interval = setInterval(() => {
        countdownDiv.textContent = `La partie commence dans ${countdown} secondes...`;
        if (countdown-- <= 0) {
            clearInterval(interval);
            countdownDiv.remove();
            document.getElementById('quiz-content').style.display = 'block';
            if (isOwner) initQuiz();
        }
    }, 1000);
}

async function initQuiz() {
    if (currentQuestionIndex >= 5) {
        if (isOwner) {
            LobbyManager.sendCommandToPlayers('show-credits', { players });
            document.addEventListener('keydown', function spaceHandler(event) {
                if (event.code === 'Space') {
                    document.removeEventListener('keydown', spaceHandler);
                    LobbyManager.sendCommandToPlayers('redirect', { url: '/index.html' });
                }
            });
        }
        return;
    }

    if (isOwner) {
        const quizData = await loadQuiz();
        if (quizData) {
            // Réinitialiser le suivi des joueurs qui ont marqué des points pour la nouvelle question
            scoredPlayers.clear();
            
            LobbyManager.sendCommandToPlayers('send-question', {
                ...quizData,
                questionIndex: currentQuestionIndex
            });
        }
    }
}

async function loadQuiz() {
    try {
        const response = await fetch('quiz-list.json');
        const data = await response.json();
        const categories = Object.keys(data);
        const category = categories[Math.floor(Math.random() * categories.length)];
        const availableQuestions = data[category].filter((_, i) => !usedQuestions.includes(i));
        
        if (availableQuestions.length === 0) {
            usedQuestions = [];
            return loadQuiz();
        }

        const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        usedQuestions.push(data[category].indexOf(question));
        return { question, category };
    } catch (error) {
        console.error("Error loading quiz:", error);
        return null;
    }
}

function displayQuestion(quizData) {
    const titleContainer = document.getElementById('title-container');
    const blackOverlay = document.getElementById('black-overlay');
    const answersContainer = document.getElementById('answers-container');
    const timerBar = document.getElementById('timer-bar');
    
    // Réinitialiser complètement le timer
    timerBar.style.transition = 'none';
    timerBar.style.transform = 'scaleX(0)';
    void timerBar.offsetHeight; // Force recalcul
    
    // Réinitialiser les classes des réponses précédentes
    document.querySelectorAll('.answer').forEach(answer => {
        answer.classList.remove('correct', 'wrong', 'selected');
        answer.style.backgroundColor = '';
    });

    // Réinitialiser le suivi des joueurs qui ont marqué des points
    scoredPlayers.clear();

    titleContainer.classList.remove('moved');
    blackOverlay.style.opacity = '1';
    answersContainer.style.opacity = '0';

    document.getElementById('question').textContent = quizData.question.question;
    document.getElementById('category').textContent = `Catégorie : ${quizData.category}`;
    document.getElementById('category-overlay').style.backgroundImage = `url('images/${quizData.category}BG.png'), url('images/ErrorBG.png')`;

    answersContainer.innerHTML = '';
    quizData.question.answers.forEach(answer => {
        const answerElement = document.createElement('div');
        answerElement.className = 'answer';
        answerElement.textContent = answer;
        answerElement.addEventListener('click', () => userSelectAnswer(answerElement));
        answersContainer.appendChild(answerElement);
    });

    setTimeout(() => {
        const backgroundMusic = document.getElementById('background-music');
        if (backgroundMusic) {
            backgroundMusic.currentTime = 0; // Réinitialiser la position de lecture
            backgroundMusic.play().catch(error => {
                console.error("Erreur lors de la lecture de la musique :", error);
            });
        } else {
            const bgMusic = new Audio('./music/BG.mp3');
            bgMusic.id = 'background-music';
            bgMusic.loop = true;
            document.body.appendChild(bgMusic);
            bgMusic.play().catch(error => {
                console.error("Erreur lors de la lecture de BG.mp3 :", error);
            });
        }
        
        questionStartTime = Date.now(); // Réinitialiser le temps de début
        titleContainer.classList.add('moved');
        blackOverlay.style.opacity = '0';
        answersContainer.style.opacity = '1';
        
        document.querySelectorAll('.answer').forEach((answer, index) => {
            setTimeout(() => {
                answer.style.opacity = '1';
                answer.style.transform = 'translateX(0)';
            }, 200 * index);
        });

        // Réinitialiser et démarrer le timer
        timerBar.style.transition = 'transform 20s linear';
        timerBar.style.transform = 'scaleX(1)';

        setTimeout(() => validateAnswers(quizData.question.correct), 20000);
    }, 4000);
}

function userSelectAnswer(answerElement) {
    const userId = localStorage.getItem("userId");
    const player = players.find(p => p.id === userId);
    if (!player) return;

    document.querySelectorAll('.answer').forEach(a => a.classList.remove('selected'));
    answerElement.classList.add('selected');
    
    // Mettre à jour le marqueur localement
    updatePlayerMarker(userId, answerElement);

    // Envoyer la réponse à tous les joueurs
    const answerIndex = Array.from(document.querySelectorAll('.answer')).indexOf(answerElement);
    const playerIndex = players.findIndex(p => p.id === userId);
    
    LobbyManager.sendCommandToPlayers('player-answer', {
        playerId: userId,
        playerIndex: playerIndex,
        answerIndex,
        responseTime: (Date.now() - questionStartTime) / 1000
    });
}

function validateAnswers(correctAnswer) {
    const userId = localStorage.getItem("userId");
    
    document.querySelectorAll('.answer').forEach(answer => {
        const isCorrect = answer.textContent.trim() === correctAnswer.trim();
        answer.classList.add(isCorrect ? 'correct' : 'wrong');
        
        if (isCorrect) {
            // Vérifier les marqueurs des joueurs sur cette réponse
            answer.querySelectorAll('.player-marker').forEach(marker => {
                const playerId = marker.dataset.playerId;
                
                // Ne mettre à jour le score que si le joueur n'a pas déjà reçu des points pour cette question
                if (playerId && !scoredPlayers.has(playerId)) {
                    // Seul l'hôte met à jour les scores pour tous les joueurs
                    if (isOwner) {
                        const player = players.find(p => p.id === playerId);
                        if (player) {
                            player.score += 1;
                            scoredPlayers.add(playerId);
                            showPlusOne(player.id);
                        }
                    }
                    // Si c'est le joueur actuel et qu'il a la bonne réponse, marquer qu'il a gagné un point
                    else if (playerId === userId) {
                        const player = players.find(p => p.id === playerId);
                        if (player) {
                            player.score += 1;
                            scoredPlayers.add(playerId);
                            showPlusOne(player.id);
                        }
                    }
                }
            });
        }
    });
    
    // Uniquement l'hôte envoie la mise à jour des scores à tous les joueurs
    if (isOwner) {
        updateScores();
    }

    if (isOwner) {
        currentQuestionIndex++;
        setTimeout(() => {
            LobbyManager.sendCommandToPlayers('next-question', { currentQuestionIndex });
            initQuiz();
        }, 5000);
    }
}

function updateScores() {
    LobbyManager.sendCommandToPlayers('update-scores', { players });
    document.querySelectorAll('.player-score').forEach((el, i) => {
        if (players[i]) el.textContent = players[i].score;
    });
}

function showPlusOne(playerId) {
    const playerElement = document.querySelector(`.player[data-player-id="${playerId}"] .player-score`);
    if (playerElement) {
        playerElement.classList.add('score-updated');
        setTimeout(() => playerElement.classList.remove('score-updated'), 1500);
    }
}

function playPopSound() {
    const selectSound = new Audio('/static/music/pop.mp3');
    selectSound.play().catch(error => {
        console.error("Erreur lors de la lecture du son pop :", error);
    });
}

window.updateMarkerPositions = (answerElement) => {
    answerElement.querySelectorAll('.player-marker').forEach((marker, i) => {
        marker.style.right = `${5 + i * 45}px`;
    });
};

window.displayQuestion = displayQuestion;
window.initQuiz = initQuiz;
window.preloadCurtains = preloadCurtains;
window.showEndGameCurtains = showEndGameCurtains;
