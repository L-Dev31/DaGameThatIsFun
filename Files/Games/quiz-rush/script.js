document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById('start-button');
    const backgroundMusic = document.getElementById('background-music');
    const playersContainer = document.getElementById('players-container');

    let playersClicked = 0; // Compteur pour suivre le nombre de joueurs ayant cliqué

    startButton.addEventListener('click', () => {
        // Désactiver et rendre le bouton opaque
        startButton.disabled = true;
        startButton.style.opacity = '0.8';

        // Ajouter le joueur 1 au conteneur des joueurs
        addPlayerToContainer(0);
        playersClicked++;

        // Simuler l'appui sur le bouton pour les autres joueurs
        for (let i = 1; i < players.length; i++) {
            setTimeout(() => {
                addPlayerToContainer(i);
                playersClicked++;

                // Démarrer le jeu une fois que tous les joueurs ont cliqué
                if (playersClicked === players.length) {
                    startButton.style.display = 'none';

                    // Afficher un message ou un compte à rebours (optionnel)
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

                    let countdown = 5;
                    countdownDiv.textContent = `La partie commence dans ${countdown} secondes...`;

                    const countdownInterval = setInterval(() => {
                        countdown--;
                        countdownDiv.textContent = `La partie commence dans ${countdown} secondes...`;

                        if (countdown <= 0) {
                            clearInterval(countdownInterval);
                            countdownDiv.remove();

                            // Démarrer la partie après 5 secondes
                            backgroundMusic.play().catch(error => {
                                console.error("Erreur lors de la lecture de la musique :", error);
                            });
                            document.getElementById('quiz-content').style.display = 'block';
                            renderPlayers();
                            initQuiz();
                        }
                    }, 1000);
                }
            }, (i * (Math.random() * 1000 + 1000))); // Délai aléatoire entre 1 et 2 secondes
        }
    });
});

function addPlayerToContainer(playerIndex) {
    const playersContainer = document.getElementById('players-container');
    const player = players[playerIndex];

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
    playSelectSound();
}

const players = [
    { name: "Jean-Jaquelino", score: 0, avatar: '/static/images/avatar/1.png' },
    { name: "George-Paulin", score: 0, avatar: '/static/images/avatar/2.png' },
    { name: "Alice",         score: 0, avatar: '/static/images/avatar/3.png' },
    { name: "Bob",           score: 0, avatar: '/static/images/avatar/4.png' },
    { name: "Charlie",       score: 0, avatar: '/static/images/avatar/5.png' },
    { name: "Diana",         score: 0, avatar: '/static/images/avatar/6.png' },
    { name: "Eve",           score: 0, avatar: '/static/images/avatar/7.png' },
    { name: "Frank",         score: 0, avatar: '/static/images/avatar/8.png' }
];

let selectedAnswer = null;
let usedQuestions = [];
let currentQuestionIndex = 0;
let quizData = null;
let fakePlayersPicked = {};

function renderPlayers() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';
    players.forEach((player) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.innerHTML = `
            <img src="${player.avatar}" alt="${player.name}">
            <div class="player-info">
                <span class="player-name">${player.name}</span>
                <span class="player-score">${player.score}</span>
            </div>
        `;
        container.appendChild(playerDiv);
    });
}

function updateScores() {
    const playerContainers = document.querySelectorAll('#players-container .player');
    playerContainers.forEach((container, index) => {
        const scoreElement = container.querySelector('.player-score');
        scoreElement.textContent = players[index].score;
    });
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
        answerElement.appendChild(marker);
        playSelectSound();
    }
    updateMarkerPositions(answerElement);
}

function userSelectAnswer(answerElement) {
    if (selectedAnswer && selectedAnswer !== answerElement) {
        selectedAnswer.classList.remove('selected');
        let existingMarker = selectedAnswer.querySelector(`.player-marker[data-player-index="0"]`);
        if (existingMarker) existingMarker.remove();
    }
    selectedAnswer = answerElement;
    answerElement.classList.add('selected');
    addPlayerMarker(answerElement, 0);
}

function playSelectSound() {
    const selectSound = new Audio('/static/music/select.mp3');
    selectSound.play().catch(error => {
        console.error("Erreur lors de la lecture du son :", error);
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
    return { question, category: randomCategory };
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
    if (currentQuestionIndex >= 10) {
        alert("Quiz terminé !");
        return;
    }
    quizData = await loadQuiz();
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
        })
        .catch(() => {
            overlay.style.backgroundImage = `url('${fallbackImageUrl}')`;
        });
    document.getElementById('question').textContent = quizData.question.question;
    document.getElementById('category').textContent = `Catégorie : ${quizData.category}`;
    answersContainer.innerHTML = '';
    quizData.question.answers.forEach(answerText => {
        const answerDiv = createAnswerElement(answerText);
        answersContainer.appendChild(answerDiv);
    });
    simulateFakePlayers();
    const timerBar = document.getElementById('timer-bar');
    timerBar.style.transform = 'scaleX(0)';
    timerBar.style.transition = 'none';
    setTimeout(() => {
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
        setTimeout(() => {
            validateAnswers(quizData.question.correct);
        }, 20000);
    }, 4000);
}

function simulateFakePlayers() {
    fakePlayersPicked = {};
    const answers = document.querySelectorAll('.answer');
    for (let i = 1; i < players.length; i++) {
        let delay = Math.random() * (28000 - 5000) + 5000;
        setTimeout(() => {
            if (fakePlayersPicked[i]) return;
            let randomAnswer = answers[Math.floor(Math.random() * answers.length)];
            addPlayerMarker(randomAnswer, i);
            fakePlayersPicked[i] = true;
        }, delay);
    }
}

function validateAnswers(correctAnswer) {
    document.querySelectorAll('.answer').forEach(answer => {
        if (answer.textContent.trim() === correctAnswer.trim()) {
            answer.classList.add('correct');
            const markers = answer.querySelectorAll('.player-marker');
            markers.forEach((marker, index) => {
                let playerIndex = marker.dataset.playerIndex;
                setTimeout(() => {
                    players[playerIndex].score++;
                    showPlusOne(playerIndex);
                }, index * 300);
            });
            setTimeout(() => {
                updateScores();
            }, markers.length * 300);
        } else {
            answer.classList.add('wrong');
        }
    });
    setTimeout(() => {
        currentQuestionIndex++;
        initQuiz();
    }, 5000);
}

function showPlusOne(playerIndex) {
    const playerContainers = document.querySelectorAll('#players-container .player');
    const container = playerContainers[playerIndex];
    if (container) {
        const scoreElement = container.querySelector('.player-score');
        scoreElement.classList.add('score-updated');
        setTimeout(() => {
            scoreElement.classList.remove('score-updated');
        }, 1500);
    }
}