import { LobbyManager } from '/Javascript/lobby_manager.js'; 
 
document.addEventListener("DOMContentLoaded", async () => {
    const startButton = document.getElementById('start-button');
    const backgroundMusic = document.getElementById('background-music');
    const playersContainer = document.getElementById('players-container');
    const videoBg = document.getElementById('video-bg');
    let playersClicked = 0;
    let isOwner = false;
    let readyPlayers = [];
    
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

function updateMarkerPositions(answerElement) {
    const markers = answerElement.querySelectorAll('.player-marker');
    markers.forEach((marker, index) => {
        marker.style.right = (5 + index * 45) + 'px';
    });
}

function addPlayerMarker(answerElement, playerIndex) {
    let existing = answerElement.querySelector(`.player-marker[data-player-index="${playerIndex}"]`);
    if (!existing) {
        let marker = document.createElement('img');
        marker.src = players[playerIndex].avatar;
        marker.className = 'player-marker';
        marker.dataset.playerIndex = playerIndex;
        marker.dataset.responseTime = ((Date.now() - questionStartTime) / 1000).toString();
        answerElement.appendChild(marker);
        playPopSound();
        console.log(`[QUIZ RUSH] Marqueur ajouté pour le joueur ${playerIndex}, temps: ${marker.dataset.responseTime}s`);
    }
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
    console.log(`[COMMAND] Réponse envoyée - Joueur: ${playerIndex}, Réponse: ${answerIndex}, Temps: ${responseTime}s`);
}

function userSelectAnswer(answerElement) {
    if (selectedAnswer && selectedAnswer !== answerElement) {
        selectedAnswer.classList.remove('selected');
        let existingMarker = selectedAnswer.querySelector(`.player-marker[data-player-index="0"]`);
        if (existingMarker) existingMarker.remove();
    }
    selectedAnswer = answerElement;
    answerElement.classList.add('selected');
    
    const userId = localStorage.getItem("userId");
    const playerIndex = players.findIndex(p => p.id === userId);
    
    if (playerIndex !== -1) {
        addPlayerMarker(answerElement, playerIndex);
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
        preloadCurtains();
        showEndGameCurtains(players);
        
        if (window.isOwner) {
            LobbyManager.sendCommandToPlayers('show-credits', {
                players: players
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
            
            LobbyManager.sendCommandToPlayers('send-question', {
                question: quizData.question,
                category: quizData.category,
                questionIndex: currentQuestionIndex,
                usedQuestionIndex: quizData.usedQuestionIndex
            });
            
            displayQuestion(quizData);
        } catch (error) {
            console.error("[ERROR] Erreur lors de l'initialisation du quiz:", error);
        }
    }
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
            
            // Seul l'owner envoie les mises à jour du timer pour éviter les conflits
            if (window.isOwner) {
                if (timerSyncInterval) {
                    clearInterval(timerSyncInterval);
                }
                
                const startTime = Date.now();
                timerSyncInterval = setInterval(() => {
                    const elapsed = (Date.now() - startTime) / 20000;
                    LobbyManager.sendCommandToPlayers('timer-sync', { progress: elapsed });
                    
                    if (elapsed >= 1) {
                        clearInterval(timerSyncInterval);
                        timerSyncInterval = null;
                        console.log("[QUIZ RUSH] Timer terminé, validation des réponses");
                        validateAnswers(quizData.question.correct);
                    }
                }, 200); // Mise à jour plus fréquente pour une meilleure synchronisation
                
                console.log("[QUIZ RUSH] Synchronisation du timer démarrée");
            }
            
            // Backup timer pour l'owner au cas où le timer principal échoue
            setTimeout(() => {
                if (window.isOwner) {
                    if (timerSyncInterval) {
                        clearInterval(timerSyncInterval);
                        timerSyncInterval = null;
                    }
                    console.log("[QUIZ RUSH] Fin du délai de 20s, validation des réponses");
                    validateAnswers(quizData.question.correct);
                }
            }, 20000);
        }, 4000);
    } catch (error) {
        console.error("[ERROR] Erreur lors de l'affichage de la question:", error);
    }
}

function preloadCurtains() {
    const curtainImages = [
        'images/curtain-left.png',
        'images/curtain-right.png',
        'images/curtain-top.png',
        'images/curtain-bottom.png'
    ];
    
    curtainImages.forEach(url => preloadImage(url));
}

function showEndGameCurtains(finalPlayers) {
    const gameContainer = document.getElementById('quiz-content');
    gameContainer.innerHTML = '';
    gameContainer.style.background = '#000';
    
    const creditsContainer = document.createElement('div');
    creditsContainer.id = 'credits-container';
    creditsContainer.style.position = 'absolute';
    creditsContainer.style.top = '0';
    creditsContainer.style.left = '0';
    creditsContainer.style.width = '100%';
    creditsContainer.style.height = '100%';
    creditsContainer.style.display = 'flex';
    creditsContainer.style.flexDirection = 'column';
    creditsContainer.style.justifyContent = 'center';
    creditsContainer.style.alignItems = 'center';
    creditsContainer.style.color = 'white';
    creditsContainer.style.textAlign = 'center';
    
    const title = document.createElement('h1');
    title.textContent = 'Fin du Quiz!';
    title.style.fontSize = '3em';
    title.style.marginBottom = '30px';
    
    const subtitle = document.createElement('h2');
    subtitle.textContent = 'Classement:';
    subtitle.style.fontSize = '2em';
    subtitle.style.marginBottom = '20px';
    
    const rankingList = document.createElement('div');
    rankingList.style.fontSize = '1.5em';
    rankingList.style.marginBottom = '40px';
    
    const sortedPlayers = [...finalPlayers].sort((a, b) => b.score - a.score);
    
    sortedPlayers.forEach((player, index) => {
        const playerRank = document.createElement('div');
        playerRank.style.margin = '10px 0';
        playerRank.innerHTML = `${index + 1}. <strong>${player.name}</strong> - ${player.score} points`;
        rankingList.appendChild(playerRank);
    });
    
    const exitText = document.createElement('p');
    if (window.isOwner) {
        exitText.textContent = 'Appuyez sur ESPACE pour revenir au menu principal';
    } else {
        exitText.textContent = 'En attente que l\'hôte termine la partie...';
    }
    exitText.style.marginTop = '30px';
    exitText.style.opacity = '0.7';
    
    creditsContainer.appendChild(title);
    creditsContainer.appendChild(subtitle);
    creditsContainer.appendChild(rankingList);
    creditsContainer.appendChild(exitText);
    
    gameContainer.appendChild(creditsContainer);
    
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && window.isOwner) {
            LobbyManager.sendCommandToPlayers('exit-credits', {
                redirect: '/index.html'
            });
        }
    });
}

window.displayQuestion = displayQuestion;
window.initQuiz = initQuiz;
window.preloadCurtains = preloadCurtains;
window.showEndGameCurtains = showEndGameCurtains;

function validateAnswers(correctAnswer) {
    console.log(`[QUIZ RUSH] Validation des réponses, réponse correcte: "${correctAnswer}"`);
    try {
        document.querySelectorAll('.answer').forEach(answer => {
            if (answer.textContent.trim() === correctAnswer.trim()) {
                answer.classList.add('correct');
                console.log(`[QUIZ RUSH] Réponse correcte: "${answer.textContent}"`);
                const markers = answer.querySelectorAll('.player-marker');
                console.log(`[QUIZ RUSH] ${markers.length} joueurs ont la bonne réponse`);
                
                markers.forEach((marker, index) => {
                    let playerIndex = parseInt(marker.dataset.playerIndex, 10);
                    let responseTime = parseFloat(marker.dataset.responseTime);
                    if (isNaN(responseTime)) {
                        responseTime = (Date.now() - questionStartTime) / 1000;
                    }
                    // Système de points simplifié : 1 point par bonne réponse
                    let points = 1;
                    players[playerIndex].score += points;
                    console.log(`[QUIZ RUSH] Joueur ${playerIndex} gagne ${points} points (temps: ${responseTime}s)`);
                    
                    setTimeout(() => {
                        showPlusOne(playerIndex);
                    }, index * 300);
                });
                setTimeout(() => {
                    updateScores();
                }, markers.length * 300);
            } else {
                answer.classList.add('wrong');
                console.log(`[QUIZ RUSH] Réponse incorrecte: "${answer.textContent}"`);
            }
        });
        
        // Seul l'owner passe à la question suivante pour éviter les conflits
        if (window.isOwner) {
            setTimeout(() => {
                currentQuestionIndex++;
                console.log(`[QUIZ RUSH] Passage à la question suivante (${currentQuestionIndex})`);
                LobbyManager.sendCommandToPlayers('next-question', { 
                    currentQuestionIndex: currentQuestionIndex 
                });
                console.log(`[COMMAND] Commande next-question envoyée (index: ${currentQuestionIndex})`);
                initQuiz();
            }, 5000);
        }
    } catch (error) {
        console.error("[ERROR] Erreur lors de la validation des réponses:", error);
    }
}

function updateScores() {
    // Tous les joueurs peuvent envoyer la mise à jour des scores
    LobbyManager.sendCommandToPlayers('update-scores', {
        players: players
    });
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
