// Variables globales
let selectedAnswer = null;
let usedQuestions = [];
let currentQuestionIndex = 0;
let quizData = null;

// Fonction pour afficher l'écran de chargement
function showLoadingScreen() {
    setTimeout(() => {
        // Masquer l'écran de chargement
        document.getElementById('loading-screen').style.display = 'none';

        // Afficher la popup pour demander si l'utilisateur veut voir la vidéo
        showModal('video-popup-overlay');

        // Gérer le clic sur "Oui"
        document.getElementById('yes-button').addEventListener('click', () => {
            hideModal('video-popup-overlay'); // Masquer la popup
            playVideo(true); // Jouer la vidéo avec le son
        });

        // Gérer le clic sur "Non"
        document.getElementById('no-button').addEventListener('click', () => {
            hideModal('video-popup-overlay'); // Masquer la popup
            startQuiz(); // Démarrer le quiz directement
        });
    }, 3000); // 3 secondes de chargement
}

// Fonction pour afficher une modale
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Fonction pour masquer une modale
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Fonction pour jouer la vidéo
function playVideo(withSound) {
    const video = document.getElementById('intro-video');
    video.style.display = 'block';
    video.muted = !withSound; // Activer ou désactiver le son
    video.play();

    // Démarrer le quiz une fois la vidéo terminée
    video.addEventListener('ended', () => {
        video.style.display = 'none';
        startQuiz();
    });
}

// Fonction pour démarrer le quiz
function startQuiz() {
    document.getElementById('quiz-content').style.display = 'block';
    initQuiz();
}

// Fonction pour charger une question aléatoire
async function loadQuiz() {
    const response = await fetch('quiz-list.json');
    const data = await response.json();

    // Choisir une catégorie au hasard
    const categories = Object.keys(data);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const questions = data[randomCategory];

    // Choisir une question aléatoire sans répétition
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * questions.length);
    } while (usedQuestions.includes(randomIndex));

    usedQuestions.push(randomIndex);
    const question = questions[randomIndex];

    return { question, category: randomCategory };
}

// Fonction pour initialiser le quiz
async function initQuiz() {
    if (currentQuestionIndex >= 10) {
        alert("Quiz terminé !");
        return;
    }

    quizData = await loadQuiz();

    function checkImageExists(imageUrl, callback) {
        const img = new Image();
        img.onload = () => callback(true);
        img.onerror = () => callback(false);
        img.src = imageUrl;
    }

    document.getElementById('title-container').classList.remove('moved');
    document.getElementById('black-overlay').style.opacity = '1';
    document.getElementById('answers-container').style.opacity = '0';

    const categoryImageUrl = `images/${quizData.category}BG.png`;
    const fallbackImageUrl = 'images/ErrorBG.png';

    setTimeout(() => {
        checkImageExists(categoryImageUrl, (exists) => {
            const overlay = document.getElementById('category-overlay');
            overlay.style.backgroundImage = `url('${exists ? categoryImageUrl : fallbackImageUrl}')`;
        });
    }, 1000);

    const questionContainer = document.getElementById('question');
    const categoryContainer = document.getElementById('category');
    questionContainer.textContent = quizData.question.question;
    categoryContainer.textContent = `Catégorie : ${quizData.category}`;

    const answersContainer = document.getElementById('answers-container');
    answersContainer.innerHTML = '';
    quizData.question.answers.forEach(answer => {
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer';
        answerDiv.textContent = answer;
        answersContainer.appendChild(answerDiv);

        answerDiv.addEventListener('click', () => {
            if (selectedAnswer) {
                selectedAnswer.classList.remove('selected');
            }
            selectedAnswer = answerDiv;
            answerDiv.classList.add('selected');
        });
    });

    const timerBar = document.getElementById('timer-bar');
    timerBar.style.transform = 'scaleX(0)';
    timerBar.style.transition = 'none';

    setTimeout(() => {
        document.getElementById('title-container').classList.add('moved');
        document.getElementById('black-overlay').style.opacity = '0';
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
    }, 5000);
}

// Fonction pour valider les réponses
function validateAnswers(correctAnswer) {
    document.querySelectorAll('.answer').forEach(answer => {
        if (answer.textContent === correctAnswer) {
            answer.classList.add('correct');
        } else {
            answer.classList.add('wrong');
        }
    });

    // Passer à la question suivante après 3 secondes
    setTimeout(() => {
        currentQuestionIndex++;
        initQuiz();
    }, 3000);
}

// Fonction pour récupérer les catégories
async function fetchCategories() {
    const response = await fetch('quiz-list.json');
    const data = await response.json();
    return Object.keys(data);
}

// Démarrer le processus
showLoadingScreen();