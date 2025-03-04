let curtainLeft = null;
let curtainRight = null;
let creditsMusic = null;

function preloadCurtains() {
    curtainLeft = new Image();
    curtainLeft.src = 'images/curtain_left.png';
    curtainRight = new Image();
    curtainRight.src = 'images/curtain_right.png';
    creditsMusic = new Audio('music/Credit.mp3');
}

function showEndGameCurtains(players) {
    const leftCurtainDiv = document.createElement('div');
    leftCurtainDiv.id = 'left-curtain';
    const rightCurtainDiv = document.createElement('div');
    rightCurtainDiv.id = 'right-curtain';

    document.body.appendChild(leftCurtainDiv);
    document.body.appendChild(rightCurtainDiv);

    setTimeout(() => {
        leftCurtainDiv.style.left = '0';
        rightCurtainDiv.style.right = '0';

        setTimeout(() => {
            document.querySelector('.main-container').style.display = 'none';
            creditsMusic.play().catch(error => console.error("Erreur musique crédits :", error));

            leftCurtainDiv.style.left = '-40%';
            rightCurtainDiv.style.right = '-40%';

            showCreditsScreen(players);
            document.addEventListener('keydown', handleKeyPress);

            document.querySelector('.overlay-gradient').classList.add('credit');

            creditsMusic.onended = () => window.location.href = '/index.html';
        }, 5000);
    }, 100);
}

function handleKeyPress(event) {
    if (event.code === 'Space') window.location.href = '/index.html';
}

function showCreditsScreen(players) {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    
    const creditsContainer = document.createElement('div');
    creditsContainer.id = 'credits-container';

    const logoImg = document.createElement('img');
    logoImg.src = 'images/logo.png';
    logoImg.alt = 'Quiz Rush Logo';
    logoImg.classList.add('credits-logo');
    creditsContainer.appendChild(logoImg);

    const devsDiv = document.createElement('div');
    devsDiv.innerHTML = `
        <h2>Développement et Design Graphique</h2>
        <p>Léo Tosku</p>
        <h2>Création de la vidéo de présentation</h2>
        <p>Korail Lamothe Jacob</p>
        <h2>Game design</h2>
        <p>Axel Desbonnes, Léo Tosku</p>
    `;
    creditsContainer.appendChild(devsDiv);

    const leaderboardDiv = document.createElement('div');
    leaderboardDiv.innerHTML = `<h2 style="margin-top: 3vh">Classement Final</h2>`;
    const playersGrid = document.createElement('div');
    playersGrid.classList.add('players-grid');

    sortedPlayers.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.classList.add('leaderboard-player');
        if (index === 0) playerCard.classList.add('rank-1');
        else if (index === 1) playerCard.classList.add('rank-2');
        else if (index === 2) playerCard.classList.add('rank-3');

        playerCard.innerHTML = `
            <span>#${index + 1}</span>
            <img src="${player.avatar}" alt="${player.name}">
            <p>${player.name}</p>
            <p>${player.score} points</p>
        `;
        playersGrid.appendChild(playerCard);
    });

    leaderboardDiv.appendChild(playersGrid);
    creditsContainer.appendChild(leaderboardDiv);

    const exitHint = document.createElement('div');
    exitHint.classList.add('exit-hint');
    exitHint.innerHTML = `<img src="/Games/credits/images/space.png" alt="Space">`;
    creditsContainer.appendChild(exitHint);

    document.body.appendChild(creditsContainer);
}

export { preloadCurtains, showEndGameCurtains };