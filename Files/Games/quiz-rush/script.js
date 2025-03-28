import { LobbyManager } from '/Javascript/lobby_manager.js';
import { preloadCurtains, showEndGameCurtains } from '/Games/general/credits.js';

// Variables globales
let currentQuestionIndex = 0;
let usedQuestions = [];
let questionStartTime = null;
let players = [];
let isOwner = false;
let readyPlayers = [];

document.addEventListener("DOMContentLoaded", async () => {
    // Initialisation
    sessionStorage.setItem('currentPage', 'quiz-rush');
    await LobbyManager.init();
    isOwner = await LobbyManager.isCurrentUserOwner();
    window.isOwner = isOwner;

    // Chargement des joueurs
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

    // Gestion des événements
    setupEventListeners();
    renderPlayersWithReducedOpacity();
    preloadCurtains();
});

function setupEventListeners() {
    // Réponses des joueurs
    document.addEventListener('player-answer-updated', (event) => {
        const { playerIndex, answerIndex } = event.detail;
        const answerElement = document.querySelectorAll('.answer')[answerIndex];
        if (answerElement) {
            updatePlayerMarker(playerIndex, answerElement);
        }
    });

    // Mise à jour des joueurs
    document.addEventListener('lobby-players-updated', (event) => {
        players = event.detail.map(p => ({
            ...p,
            score: players.find(op => op.id === p.id)?.score || 0
        }));
        window.players = players;
        renderPlayersWithReducedOpacity();
    });

    // Joueurs prêts
    document.addEventListener('player-ready', (event) => {
        if (!readyPlayers.includes(event.detail.playerId)) {
            readyPlayers.push(event.detail.playerId);
            renderPlayersWithReducedOpacity();
            if (readyPlayers.length === players.length) {
                startGameCountdown();
            }
        }
    });

    // Bouton de démarrage
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

function updatePlayerMarker(playerIndex, answerElement) {
    // Supprimer les anciens marqueurs
    document.querySelectorAll(`.player-marker[data-player-index="${playerIndex}"]`).forEach(m => m.remove());
    
    // Ajouter le nouveau marqueur
    const marker = document.createElement('img');
    marker.src = players[playerIndex].avatar;
    marker.className = 'player-marker';
    marker.dataset.playerIndex = playerIndex;
    answerElement.appendChild(marker);
    updateMarkerPositions(answerElement);
}

function renderPlayersWithReducedOpacity() {
    const container = document.getElementById('players-container');
    container.innerHTML = players.map(player => `
        <div class="player" data-player-id="${player.id}" style="opacity:${readyPlayers.includes(player.id) ? 1 : 0.25}">
            <img src="${player.avatar}" alt="${player.name}">
            <div class="player-info">
                <span class="player-name">${player.isOwner ? '👑 ' : ''}${player.name}${player.isCurrentUser ? ' (Vous)' : ''}</span>
                <span class="player-score">${player.score}</span>
            </div>
        </div>
    `).join('');
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
    // Réinitialisation de l'interface
    const titleContainer = document.getElementById('title-container');
    const blackOverlay = document.getElementById('black-overlay');
    const answersContainer = document.getElementById('answers-container');
    
    // Réinitialiser les animations
    titleContainer.classList.remove('moved');
    blackOverlay.style.opacity = '1';
    answersContainer.style.opacity = '0';

    document.getElementById('question').textContent = quizData.question.question;
    document.getElementById('category').textContent = `Catégorie : ${quizData.category}`;
    document.getElementById('category-overlay').style.backgroundImage = `url('images/${quizData.category}BG.png'), url('images/ErrorBG.png')`;

    // Création des réponses
    answersContainer.innerHTML = '';
    quizData.question.answers.forEach(answer => {
        const answerElement = document.createElement('div');
        answerElement.className = 'answer';
        answerElement.textContent = answer;
        answerElement.addEventListener('click', () => userSelectAnswer(answerElement));
        answersContainer.appendChild(answerElement);
    });

    // Animation d'entrée
    setTimeout(() => {
        questionStartTime = Date.now();
        
        // Activer l'animation "moved"
        titleContainer.classList.add('moved');
        blackOverlay.style.opacity = '0';
        answersContainer.style.opacity = '1';
        
        // Animation des réponses
        document.querySelectorAll('.answer').forEach((answer, index) => {
            setTimeout(() => {
                answer.style.opacity = '1';
                answer.style.transform = 'translateX(0)';
            }, 200 * index);
        });

        // Barre de temps
        document.getElementById('timer-bar').style.transition = 'transform 20s linear';
        document.getElementById('timer-bar').style.transform = 'scaleX(1)';

        // Validation automatique après 20s
        setTimeout(() => validateAnswers(quizData.question.correct), 20000);
    }, 4000);
}

function userSelectAnswer(answerElement) {
    const userId = localStorage.getItem("userId");
    const playerIndex = players.findIndex(p => p.id === userId);
    if (playerIndex === -1) return;

    // Mise à jour de l'interface
    document.querySelectorAll('.answer').forEach(a => a.classList.remove('selected'));
    answerElement.classList.add('selected');
    updatePlayerMarker(playerIndex, answerElement);

    // Envoi de la réponse
    const answerIndex = Array.from(document.querySelectorAll('.answer')).indexOf(answerElement);
    LobbyManager.sendCommandToPlayers('player-answer', {
        playerId: userId,
        playerIndex,
        answerIndex,
        responseTime: (Date.now() - questionStartTime) / 1000
    });
}

function validateAnswers(correctAnswer) {
    document.querySelectorAll('.answer').forEach(answer => {
        const isCorrect = answer.textContent.trim() === correctAnswer.trim();
        answer.classList.add(isCorrect ? 'correct' : 'wrong');
        
        if (isCorrect) {
            answer.querySelectorAll('.player-marker').forEach(marker => {
                const playerIndex = marker.dataset.playerIndex;
                players[playerIndex].score += 1;
                showPlusOne(playerIndex);
            });
        }
    });

    updateScores();

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

function showPlusOne(playerIndex) {
    const playerElement = document.querySelector(`.player[data-player-id="${players[playerIndex].id}"] .player-score`);
    if (playerElement) {
        playerElement.classList.add('score-updated');
        setTimeout(() => playerElement.classList.remove('score-updated'), 1500);
    }
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