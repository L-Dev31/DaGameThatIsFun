import { LobbyManager } from '/Javascript/lobby_manager.js'; 
import { preloadCurtains, showEndGameCurtains } from '/Games/general/credits.js';
 
document.addEventListener("DOMContentLoaded", async () => {
    const startButton = document.getElementById('start-button');
    const backgroundMusic = document.getElementById('background-music');
    const playersContainer = document.getElementById('players-container');
    const videoBg = document.getElementById('video-bg');
    let playersClicked = 0;
    let isOwner = false;
    let readyPlayers = [];
    
    // Écouteur pour l'événement player-answer-updated
    document.addEventListener('player-answer-updated', (event) => {
        const { playerId, playerIndex, answerIndex } = event.detail;
        const answers = document.querySelectorAll('.answer');
        if (answerIndex >= 0 && answerIndex < answers.length) {
            // Mettre à jour l'interface pour refléter la réponse du joueur
            const answerElement = answers[answerIndex];
            // Ne pas envoyer de nouvelle commande, juste mettre à jour l'interface
            if (playerIndex !== -1 && window.players && window.players[playerIndex]) {
                // Supprimer tous les marqueurs existants pour ce joueur
                document.querySelectorAll(`.player-marker[data-player-index="${playerIndex}"]`).forEach(marker => {
                    marker.remove();
                });
                
                // Vérifier si le marqueur existe déjà sur cette réponse
                let existingMarker = answerElement.querySelector(`.player-marker[data-player-index="${playerIndex}"]`);
                if (!existingMarker) {
                    // Créer un nouveau marqueur avec l'avatar du joueur
                    let marker = document.createElement('img');
                    marker.src = window.players[playerIndex].avatar;
                    marker.className = 'player-marker';
                    marker.dataset.playerIndex = playerIndex;
                    marker.dataset.playerId = window.players[playerIndex].id;
                    marker.dataset.responseTime = event.detail.responseTime.toString();
                    answerElement.appendChild(marker);
                    
                    // Mettre à jour la position des marqueurs
                    if (typeof window.updateMarkerPositions === 'function') {
                        window.updateMarkerPositions(answerElement);
                    }
                }
            }
        }
    });
    
    sessionStorage.setItem('currentPage', 'quiz-rush');
    
    if (videoBg) {
        setTimeout(() => {
            try {
                videoBg.innerHTML = '';
                const source = document.createElement('source');
                source.src = `images/BG.mp4?nocache=${Date.now()}`;
                source.type = 'video/mp4';
                videoBg.appendChild(source);
                
                setTimeout(() => {
                    try {
                        videoBg.load();
                        const playPromise = videoBg.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {});
                        }
                    } catch (e) {}
                }, 500);
            } catch (e) {}
        }, 1000);
        
        videoBg.addEventListener('error', (e) => {
            videoBg.style.display = 'none';
        });
    }
    
    LobbyManager.init();
    
    isOwner = await LobbyManager.isCurrentUserOwner();
    window.isOwner = isOwner;
    console.log(`[QUIZ RUSH] Statut owner = ${isOwner}`);
    
    const realPlayers = await LobbyManager.getActivePlayers();
    console.log("[QUIZ RUSH] Joueurs récupérés", realPlayers);
    
    window.players = realPlayers.map(player => ({
        id: player.id,
        name: player.name,
        score: 0,
        avatar: player.avatar,
        isOwner: player.isOwner,
        isCurrentUser: player.isCurrentUser
    }));
    
    renderPlayersWithReducedOpacity();
    
    document.addEventListener('lobby-players-updated', async (event) => {
        console.log("[QUIZ RUSH] Mise à jour des joueurs", event.detail);
        const updatedPlayers = event.detail;
        window.players = updatedPlayers.map(player => ({
            id: player.id,
            name: player.name,
            score: window.players.find(p => p.id === player.id)?.score || 0,
            avatar: player.avatar,
            isOwner: player.isOwner,
            isCurrentUser: player.isCurrentUser
        }));
        renderPlayersWithReducedOpacity();
    });
    
    document.addEventListener('player-ready', (event) => {
        const playerId = event.detail.playerId;
        if (!readyPlayers.includes(playerId)) {
            readyPlayers.push(playerId);
            console.log(`[QUIZ RUSH] Joueur ${playerId} prêt (${readyPlayers.length}/${window.players.length})`);
            renderPlayersWithReducedOpacity();
            
            // Tous les joueurs peuvent vérifier si tous sont prêts
            if (readyPlayers.length >= window.players.length) {
                // Tous les joueurs déclenchent le compte à rebours, pas seulement l'owner
                checkAllPlayersReady();
            }
        }
    });
    
    // Écouter l'événement start-countdown pour s'assurer que tous les joueurs voient le compte à rebours
    document.addEventListener('start-countdown', (event) => {
        console.log("[QUIZ RUSH] Événement start-countdown reçu", event.detail);
        // Masquer le bouton de démarrage pour tous les joueurs
        if (startButton) {
            startButton.style.display = 'none';
        }
    });
    
    function renderPlayersWithReducedOpacity() {
        playersContainer.innerHTML = '';
        window.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player';
            playerDiv.style.opacity = readyPlayers.includes(player.id) ? '1' : '0.25';
            playerDiv.dataset.playerId = player.id;  // Ajout explicite de l'attribut data-player-id
            
            // Créer le nom du joueur avec indicateurs
            let playerName = player.name;
            if (player.isCurrentUser) {
                playerName += ' (Vous)';
            }
            
            // Ajouter la couronne pour l'owner
            const crownIcon = player.isOwner ? '👑 ' : '';
            
            playerDiv.innerHTML = `
                <img src="${player.avatar}" alt="${player.name}">
                <div class="player-info">
                    <span class="player-name">${crownIcon}${playerName}</span>
                    <span class="player-score">${player.score}</span>
                </div>
            `;
            playersContainer.appendChild(playerDiv);
        });
        console.log("[QUIZ RUSH] Joueurs rendus avec opacité mise à jour");
    }
    
    if (startButton) {
        startButton.style.display = 'block';
        startButton.textContent = 'Commencer !';
        
        startButton.addEventListener('click', () => {
            console.log("[QUIZ RUSH] Bouton Commencer cliqué");
            startButton.disabled = true;
            
            const userId = localStorage.getItem("userId");
            const playerIndex = window.players.findIndex(p => p.id === userId);
            console.log(`[QUIZ RUSH] Joueur ${userId} prêt (index: ${playerIndex})`);
            
            if (playerIndex !== -1) {
                // Tous les joueurs envoient la commande player-ready, pas seulement l'owner
                LobbyManager.sendCommandToPlayers('player-ready', { 
                    playerId: userId,
                    playerIndex: playerIndex,
                    readyPlayers: readyPlayers.concat(userId) // Envoyer la liste mise à jour des joueurs prêts
                });
                console.log(`[COMMAND] Commande player-ready envoyée pour ${userId}`);
                
                // Tous les joueurs peuvent vérifier si tous sont prêts, mais seul l'owner lance le compte à rebours
                if (isOwner && readyPlayers.length >= window.players.length) {
                    checkAllPlayersReady();
                }
            }
        });
    }
    
    function checkAllPlayersReady() {
        if (readyPlayers.length >= window.players.length) {
            console.log("[QUIZ RUSH] Tous les joueurs sont prêts, démarrage du compte à rebours");
            
            // Masquer le bouton de démarrage pour tous les joueurs
            if (startButton) {
                startButton.style.display = 'none';
            }
            
            // Créer le compte à rebours pour tous les joueurs
            const countdownDiv = document.createElement('div');
            countdownDiv.id = 'countdown';
            countdownDiv.style.position = 'fixed';
            countdownDiv.style.top = '50%';
            countdownDiv.style.left = '50%';
            countdownDiv.style.transform = 'translate(-50%, -50%)';
            countdownDiv.style.fontSize = '2em';
            countdownDiv.style.color = 'white';
            countdownDiv.style.zIndex = '1000';
            document.body.appendChild(countdownDiv);
            
            // Seul l'owner envoie la commande pour synchroniser le compte à rebours
            if (isOwner) {
                LobbyManager.sendCommandToPlayers('start-countdown', { duration: 5 });
                console.log("[COMMAND] Commande start-countdown envoyée");
            }
            
            // Gérer le compte à rebours localement pour tous les joueurs
            let countdown = 5;
            countdownDiv.textContent = `La partie commence dans ${countdown} secondes...`;
            const countdownInterval = setInterval(() => {
                countdown--;
                countdownDiv.textContent = `La partie commence dans ${countdown} secondes...`;
                if (countdown <= 0) {
                    clearInterval(countdownInterval);
                    countdownDiv.remove();
                    
                    // Seul l'owner envoie la commande pour synchroniser le démarrage du jeu
                    if (isOwner) {
                        LobbyManager.sendCommandToPlayers('start-game', {});
                        console.log("[COMMAND] Commande start-game envoyée");
                    }
                    
                    // Tous les joueurs affichent le contenu du quiz
                    document.getElementById('quiz-content').style.display = 'block';
                    renderPlayers();
                    
                    // Seul l'owner initialise le quiz et envoie les questions
                    if (isOwner) {
                        console.log("[QUIZ RUSH] Initialisation du quiz par l'owner");
                        initQuiz();
                    }
                }
            }, 1000);
        }
    }
    
    sessionStorage.removeItem('isRedirecting');
});

let selectedAnswer = null;
let usedQuestions = [];
let currentQuestionIndex = 0;
let quizData = null;
let fakePlayersPicked = {};
let questionStartTime = null;
let timerSyncInterval = null;

function renderPlayers() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';
    players.forEach((player) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        
        // Créer le nom du joueur avec indicateurs
        let playerName = player.name;
        if (player.isCurrentUser) {
            playerName += ' (Vous)';
        }
        
        // Ajouter la couronne pour l'owner
        const crownIcon = player.isOwner ? '👑 ' : '';
        
        playerDiv.innerHTML = `
            <img src="${player.avatar}" alt="${player.name}">
            <div class="player-info">
                <span class="player-name">${crownIcon}${playerName}</span>
                <span class="player-score">${player.score}</span>
            </div>
        `;
        container.appendChild(playerDiv);
    });
    console.log("[QUIZ RUSH] Joueurs rendus avec opacité normale");
}

function updateScores() {
    const playerContainers = document.querySelectorAll('#players-container .player');
    playerContainers.forEach((container, index) => {
        const scoreElement = container.querySelector('.player-score');
        if (index < players.length) {
            scoreElement.textContent = players[index].score;
        }
    });
    
    LobbyManager.sendCommandToPlayers('update-scores', {
        players: players
    });
}

function updateMarkerPositions(answerElement) {
    const markers = answerElement.querySelectorAll('.player-marker');
    markers.forEach((marker, index) => {
        marker.style.right = (5 + index * 45) + 'px';
    });
}

function addPlayerMarker(answerElement, playerIndex) {
    // Supprimer tous les marqueurs existants pour ce joueur sur toutes les réponses
    document.querySelectorAll(`.player-marker[data-player-index="${playerIndex}"]`).forEach(marker => {
        marker.remove();
    });
    
    // Créer un nouveau marqueur
    let marker = document.createElement('img');
    marker.src = players[playerIndex].avatar;
    marker.className = 'player-marker';
    marker.dataset.playerIndex = playerIndex;
    marker.dataset.responseTime = ((Date.now() - questionStartTime) / 1000).toString();
    answerElement.appendChild(marker);
    playPopSound();
    
    updateMarkerPositions(answerElement);
    
    // Tous les joueurs envoient leur réponse à tous les autres joueurs
    const answerIndex = Array.from(document.querySelectorAll('.answer')).indexOf(answerElement);
    const responseTime = (Date.now() - questionStartTime) / 1000;
    LobbyManager.sendCommandToPlayers('player-answer', {
        playerId: players[playerIndex].id,
        playerIndex: playerIndex,
        answerIndex: answerIndex,
        responseTime: responseTime
    });
}

function userSelectAnswer(answerElement) {
    if (selectedAnswer && selectedAnswer !== answerElement) {
        selectedAnswer.classList.remove('selected');
    }
    selectedAnswer = answerElement;
    answerElement.classList.add('selected');
    
    const userId = localStorage.getItem("userId");
    const playerIndex = players.findIndex(p => p.id === userId);
    
    if (playerIndex !== -1) {
        // Supprimer tous les marqueurs existants pour ce joueur sur toutes les réponses
        document.querySelectorAll(`.player-marker[data-player-index="${playerIndex}"]`).forEach(marker => {
            marker.remove();
        });
        
        // Créer un nouveau marqueur localement immédiatement
        let marker = document.createElement('img');
        marker.src = players[playerIndex].avatar;
        marker.className = 'player-marker';
        marker.dataset.playerIndex = playerIndex;
        marker.dataset.responseTime = ((Date.now() - questionStartTime) / 1000).toString();
        answerElement.appendChild(marker);
        
        // Mettre à jour la position des marqueurs localement
        updateMarkerPositions(answerElement);
        
        // Jouer le son
        playPopSound();
        
        // Envoyer la réponse à tous les joueurs
        const answerIndex = Array.from(document.querySelectorAll('.answer')).indexOf(answerElement);
        const responseTime = (Date.now() - questionStartTime) / 1000;
        LobbyManager.sendCommandToPlayers('player-answer', {
            playerId: players[playerIndex].id,
            playerIndex: playerIndex,
            answerIndex: answerIndex,
            responseTime: responseTime
        });
    }
}

function playPopSound() {
    const selectSound = new Audio('/static/music/pop.mp3');
    selectSound.play().catch(error => {
        console.error("[ERROR] Erreur lors de la lecture du son :", error);
    });
}

function createAnswerElement(answerText) {
    const answerDiv = document.createElement('div');
    answerDiv.className = 'answer';
    answerDiv.textContent = answerText;
    answerDiv.addEventListener('click', () => {
        userSelectAnswer(answerDiv);
    });
    return answerDiv;
}

async function loadQuiz() {
    console.log("[QUIZ RUSH] Chargement d'une nouvelle question");
    try {
        const response = await fetch('quiz-list.json');
        const data = await response.json();
        const categories = Object.keys(data);
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const questions = data[randomCategory];
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * questions.length);
        } while (usedQuestions.includes(randomIndex));
        usedQuestions.push(randomIndex);
        const question = questions[randomIndex];
        console.log(`[QUIZ RUSH] Question chargée - Catégorie: ${randomCategory}, Index: ${randomIndex}`);
        return { question, category: randomCategory, usedQuestionIndex: randomIndex };
    } catch (error) {
        console.error("[ERROR] Erreur lors du chargement du quiz:", error);
        return null;
    }
}

function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = () => reject(url);
        img.src = url;
    });
}

async function initQuiz() {
    if (currentQuestionIndex >= 5) {
        if (window.isOwner) {
            LobbyManager.sendCommandToPlayers('show-credits', {
                players: window.players
            });
            
            document.addEventListener('keydown', function spaceHandler(event) {
                if (event.code === 'Space') {
                    document.removeEventListener('keydown', spaceHandler);
                    LobbyManager.sendCommandToPlayers('redirect', {
                        url: '/index.html'
                    });
                }
            });
        }
        
        return;
    }
    
    if (window.isOwner) {
        try {
            quizData = await loadQuiz();
            if (!quizData) {
                return;
            }
            
            // L'owner envoie la question à tous les joueurs
            LobbyManager.sendCommandToPlayers('send-question', {
                question: quizData.question,
                category: quizData.category,
                questionIndex: currentQuestionIndex,
                usedQuestionIndex: quizData.usedQuestionIndex
            });
            
            // L'owner n'a pas besoin d'appeler displayQuestion ici car il recevra aussi la commande send-question
        } catch (error) {
            console.error("[ERROR] Erreur lors de l'initialisation du quiz:", error);
        }
    }
    
    // Écouter l'événement question-received pour s'assurer que tous les joueurs sont synchronisés
    document.addEventListener('question-received', (event) => {
        if (event.detail) {
            displayQuestion(event.detail);
        }
    });
}

function displayQuestion(quizData) {
    console.log("[QUIZ RUSH] Affichage de la question", quizData);
    try {
        const titleContainer = document.getElementById('title-container');
        const blackOverlay = document.getElementById('black-overlay');
        const answersContainer = document.getElementById('answers-container');
        titleContainer.classList.remove('moved');
        blackOverlay.style.opacity = '1';
        answersContainer.style.opacity = '0';
        const categoryImageUrl = `images/${quizData.category}BG.png`;
        const fallbackImageUrl = 'images/ErrorBG.png';
        const overlay = document.getElementById('category-overlay');
        preloadImage(categoryImageUrl)
            .then(() => {
                overlay.style.backgroundImage = `url('${categoryImageUrl}')`;
                console.log(`[QUIZ RUSH] Image de catégorie chargée: ${categoryImageUrl}`);
            })
            .catch(() => {
                overlay.style.backgroundImage = `url('${fallbackImageUrl}')`;
                console.log(`[WARNING] Image de catégorie non trouvée, utilisation de l'image par défaut`);
            });
        document.getElementById('question').textContent = quizData.question.question;
        document.getElementById('category').textContent = `Catégorie : ${quizData.category}`;
        answersContainer.innerHTML = '';
        quizData.question.answers.forEach(answerText => {
            const answerDiv = createAnswerElement(answerText);
            answersContainer.appendChild(answerDiv);
        });
        
        const timerBar = document.getElementById('timer-bar');
        timerBar.style.transform = 'scaleX(0)';
        timerBar.style.transition = 'none';
        
        setTimeout(() => {
            const backgroundMusic = document.getElementById('background-music');
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(error => {
                console.error("[ERROR] Erreur lors de la lecture de la musique :", error);
            });
            
            questionStartTime = Date.now();
            console.log(`[QUIZ RUSH] Démarrage du timer à ${new Date(questionStartTime).toISOString()}`);
            
            titleContainer.classList.add('moved');
            blackOverlay.style.opacity = '0';
            answersContainer.style.opacity = '1';
            document.querySelectorAll('.answer').forEach((answer, index) => {
                setTimeout(() => {
                    answer.style.opacity = '1';
                    answer.style.transform = 'translateX(0)';
                }, 200 * index);
            });
            timerBar.style.transition = 'transform 20s linear';
            timerBar.style.transform = 'scaleX(1)';
            
            // Tous les joueurs valident les réponses localement après 20 secondes
            setTimeout(() => {
                console.log("[QUIZ RUSH] Fin du délai de 20s, validation des réponses");
                if (quizData && quizData.question) {
                    validateAnswers(quizData.question.correct);
                }
            }, 20000);
            
            // Seul l'owner passe à la question suivante après 25 secondes
            if (window.isOwner) {
                setTimeout(() => {
                    currentQuestionIndex++;
                    LobbyManager.sendCommandToPlayers('next-question', { 
                        currentQuestionIndex: currentQuestionIndex 
                    });
                    initQuiz();
                }, 25000);
            }
        }, 4000);
    } catch (error) {
        console.error("[ERROR] Erreur lors de l'affichage de la question:", error);
    }
}

// Les fonctions preloadCurtains et showEndGameCurtains sont importées depuis /Games/general/credits.js

window.displayQuestion = displayQuestion;
window.initQuiz = initQuiz;
window.preloadCurtains = preloadCurtains;
window.showEndGameCurtains = showEndGameCurtains;
window.updateMarkerPositions = updateMarkerPositions;
window.addPlayerMarker = addPlayerMarker;

function validateAnswers(correctAnswer) {
    try {
        // Appliquer le style correct/incorrect à toutes les réponses
        document.querySelectorAll('.answer').forEach(answer => {
            if (answer.textContent.trim() === correctAnswer.trim()) {
                answer.classList.add('correct');
                answer.style.backgroundColor = 'gold';
                answer.style.opacity = '1';
                const markers = answer.querySelectorAll('.player-marker');
                
                // Mettre à jour les scores pour tous les joueurs qui ont la bonne réponse
                markers.forEach((marker, index) => {
                    let playerIndex = parseInt(marker.dataset.playerIndex, 10);
                    // Système de points simplifié : 1 point par bonne réponse
                    let points = 1;
                    players[playerIndex].score += points;
                    
                    setTimeout(() => {
                        showPlusOne(playerIndex);
                    }, index * 300);
                });
                
                // Envoyer immédiatement les scores mis à jour à tous les joueurs
                updateScores();
            } else {
                answer.classList.add('wrong');
            }
        });
        
        // Seul l'owner passe à la question suivante pour éviter les conflits
        if (window.isOwner) {
            setTimeout(() => {
                currentQuestionIndex++;
                LobbyManager.sendCommandToPlayers('next-question', { 
                    currentQuestionIndex: currentQuestionIndex 
                });
                initQuiz();
            }, 5000);
        }
    } catch (error) {
        console.error("[ERROR] Erreur lors de la validation des réponses:", error);
    }
}



function showPlusOne(playerIndex) {
    try {
        const playerContainers = document.querySelectorAll('#players-container .player');
        const container = playerContainers[playerIndex];
        if (container) {
            const scoreElement = container.querySelector('.player-score');
            scoreElement.classList.add('score-updated');
            setTimeout(() => {
                scoreElement.classList.remove('score-updated');
            }, 1500);
        }
    } catch (error) {
        console.error("[ERROR] Erreur lors de l'affichage de l'animation de score:", error);
    }
}
