import { preloadCurtains } from '/Games/general/credits.js';
import { showEndGameCurtains } from '/Games/general/credits.js';
import { players } from '/Games/general/players.js'; 

class DrawingGame {
  constructor() {
    this.words = [];
    this.currentRound = 1;
    this.maxRounds = 5;
    this.totalGamesPlayed = 0;
    this.history = [];
    this.redoStack = [];
    this.currentDrawings = [];
    this.timeLeft = 60;
    this.timerInterval = null;
    
    this.setupElements();
    this.setupCanvas();
    this.setupEventListeners();
    this.loadWords();
  }

  async loadWords() {
    try {
      const response = await fetch("word-list.json");
      const data = await response.json();
      this.words = data.words;
      this.startGame();
    } catch (error) {
      console.error("Erreur lors du chargement des mots :", error);
    }
  }

  setupElements() {
    this.wordReveal = document.getElementById('word-reveal');
    this.titleContainer = document.getElementById('title-container');
    this.questionElem = document.getElementById('question');
    this.categoryElem = document.getElementById('category');
    this.canvas = document.getElementById('drawingCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.timerText = document.querySelector('.timer-text');
    this.finishButton = document.querySelector('.finish-button');
    this.votingContainer = document.querySelector('.voting-container');
    this.rankingContainer = document.querySelector('.ranking-container');
    this.undoButton = document.getElementById('undoButton');
    this.redoButton = document.getElementById('redoButton');
  }

  setupCanvas() {
    const maxWidth = Math.min(window.innerWidth * 0.8, 1250);
    const maxHeight = Math.min(window.innerHeight * 0.7, 800);
    this.canvas.width = maxWidth;
    this.canvas.height = maxHeight;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 5;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#000000';
    this.currentSize = 5;
    this.lastX = 0;
    this.lastY = 0;
  }

  setupEventListeners() {
    this.setupDrawingEvents();
    this.setupToolEvents();
    this.setupButtonEvents();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  setupDrawingEvents() {
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.startDrawing({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.draw({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    });

    this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  setupToolEvents() {
    document.querySelectorAll('.tool').forEach(tool => {
      tool.addEventListener('click', () => {
        document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
        tool.classList.add('active');
        this.currentTool = tool.dataset.tool;
      });
    });

    document.querySelectorAll('.color-pick').forEach(color => {
      color.addEventListener('click', () => {
        document.querySelectorAll('.color-pick').forEach(c => c.classList.remove('active'));
        color.classList.add('active');
        this.currentColor = color.dataset.color;
        this.ctx.strokeStyle = this.currentColor;
      });
    });

    document.querySelectorAll('.brush-size').forEach(size => {
      size.addEventListener('click', () => {
        document.querySelectorAll('.brush-size').forEach(s => s.classList.remove('active'));
        size.classList.add('active');
        this.currentSize = parseInt(size.dataset.size);
        this.ctx.lineWidth = this.currentSize;
      });
    });
  }

  setupButtonEvents() {
    this.finishButton.addEventListener('click', () => this.finishDrawing());
    document.querySelector('.submit-votes').addEventListener('click', () => this.submitVotes());
    document.querySelector('.next-round').addEventListener('click', () => this.nextRound());
    this.undoButton.addEventListener('click', () => this.undo());
    this.redoButton.addEventListener('click', () => this.redo());
  }

  handleResize() {
    const maxWidth = Math.min(window.innerWidth * 0.8, 800);
    const maxHeight = Math.min(window.innerHeight * 0.6, 600);
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = maxWidth;
    this.canvas.height = maxHeight;
    this.ctx.putImageData(imageData, 0, 0);
  }

  startDrawing(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.isDrawing = true;
    [this.lastX, this.lastY] = [
      e.clientX - rect.left,
      e.clientY - rect.top
    ];
    this.addToHistory();
  }

  draw(e) {
    if (!this.isDrawing) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
      this.ctx.lineTo(x, y);
      this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
      this.ctx.stroke();
    } else if (this.currentTool === 'bucket') {
      this.floodFill(x, y);
    }

    [this.lastX, this.lastY] = [x, y];
  }

  stopDrawing() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.addToHistory();
    }
  }

  floodFill(startX, startY) {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;
    const startPos = (startY * this.canvas.width + startX) * 4;
    const startR = pixels[startPos];
    const startG = pixels[startPos + 1];
    const startB = pixels[startPos + 2];
    const startA = pixels[startPos + 3];
    const fillColor = this.hexToRgb(this.currentColor);
    
    if (!fillColor) return;

    const matchStartColor = (pos) => {
      return pixels[pos] === startR &&
             pixels[pos + 1] === startG &&
             pixels[pos + 2] === startB &&
             pixels[pos + 3] === startA;
    };

    const colorPixel = (pos) => {
      pixels[pos] = fillColor.r;
      pixels[pos + 1] = fillColor.g;
      pixels[pos + 2] = fillColor.b;
      pixels[pos + 3] = 255;
    };

    const queue = [[startX, startY]];
    
    while (queue.length > 0) {
      const [x, y] = queue.pop();
      const pos = (y * this.canvas.width + x) * 4;

      if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) continue;
      if (!matchStartColor(pos)) continue;

      colorPixel(pos);

      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    this.ctx.putImageData(imageData, 0, 0);
    this.addToHistory();
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  startGame() {
    this.currentWord = this.words[Math.floor(Math.random() * this.words.length)];
    this.animateWordAppearance(this.currentWord);
  }

  animateWordAppearance(word) {
    this.wordReveal.style.opacity = '0';
    this.wordReveal.style.transform = 'translate(-50%, -50%) scale(0.8)';
    this.wordReveal.textContent = word;
    
    setTimeout(() => {
      this.wordReveal.style.display = 'block';
      this.wordReveal.style.opacity = '1';
      this.wordReveal.style.transform = 'translate(-50%, -50%) scale(1.2)';
      
      setTimeout(() => {
        this.wordReveal.style.opacity = '0';
        this.wordReveal.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        setTimeout(() => {
          this.wordReveal.style.display = 'none';
          this.titleContainer.style.opacity = '1';
          this.questionElem.textContent = word;
          this.startTimer();
        }, 500);
      }, 2000);
    }, 100);
  }

  startTimer() {
    this.timeLeft = 60;
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.timerText.textContent = this.timeLeft;
      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.finishDrawing();
      }
    }, 1000);
  }

  finishDrawing() {
    clearInterval(this.timerInterval);
    const drawingData = this.canvas.toDataURL();
    
    // Use quiz-rush players structure
    const userPlayer = players.find(p => p.avatar.includes('8.png')); // Find Bob
    const simulatedPlayers = players.filter(p => !p.avatar.includes('8.png')); // Other players

    this.currentDrawings = [
      { 
        image: drawingData,
        votes: 0,
        isUser: true,
        username: userPlayer.name,
        pfp: userPlayer.avatar
      },
      ...simulatedPlayers.map(player => ({
        image: this.generateSimulatedDrawing(),
        votes: 0,
        isUser: false,
        username: player.name,
        pfp: player.avatar
      }))
    ];
    this.showVoting();
  }

  generateSimulatedDrawing() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL();
  }

  showVoting() {
    this.votingContainer.classList.remove('hidden');
    this.votingContainer.classList.add('active');

    const drawingsGrid = document.querySelector('.drawings-grid');
    drawingsGrid.innerHTML = '';

    this.currentDrawings.forEach((drawing, index) => {
      const card = document.createElement('div');
      card.className = `drawing-card${drawing.isUser ? ' disabled' : ''}`;
      const img = document.createElement('img');
      img.src = drawing.image;
      img.alt = `Drawing by ${drawing.username}`;
      const username = document.createElement('div');
      username.className = 'username';
      username.textContent = drawing.username;
      const pfp = document.createElement('img');
      pfp.src = drawing.pfp;
      pfp.alt = `${drawing.username}'s profile picture`;
      pfp.className = 'pfp';
      
      card.appendChild(pfp);
      card.appendChild(img);
      card.appendChild(username);

      if (!drawing.isUser) {
        card.addEventListener('click', () => this.toggleVote(index, card));
      }

      drawingsGrid.appendChild(card);
    });
  }

  toggleVote(index, card) {
    const selected = card.classList.contains('selected');
    document.querySelectorAll('.drawing-card').forEach(c => c.classList.remove('selected'));
    if (!selected) {
      card.classList.add('selected');
      this.selectedVoteIndex = index;
    } else {
      this.selectedVoteIndex = null;
    }
  }

  submitVotes() {
    if (this.selectedVoteIndex !== undefined && this.selectedVoteIndex !== null) {
      this.currentDrawings[this.selectedVoteIndex].votes++;
      this.showRanking();
    }
  }

  showRanking() {
    const sortedDrawings = [...this.currentDrawings].sort((a, b) => b.votes - a.votes);
    this.rankingContainer.classList.remove('hidden');
    this.rankingContainer.classList.add('active');
    this.votingContainer.classList.remove('active');
    this.votingContainer.classList.add('hidden');

    const rankingList = document.querySelector('.ranking-list');
    rankingList.innerHTML = '';

    this.animateRanking(sortedDrawings);
  }

  animateRanking(sortedDrawings) {
    let delay = 0;
    const delayIncrement = 1000;
    const rankingList = document.querySelector('.ranking-list');

    sortedDrawings.slice().reverse().forEach((drawing, index) => {
      setTimeout(() => {
        const rankingItem = this.createRankingItem(drawing, sortedDrawings.length - 1 - index);
        rankingList.prepend(rankingItem);

        setTimeout(() => {
          rankingItem.classList.add('show');
        }, 50);
      }, delay);

      delay += delayIncrement;
    });
  }

  createRankingItem(drawing, index) {
    const rankingItem = document.createElement('div');
    rankingItem.className = 'ranking-item';
    if (index === 0) rankingItem.classList.add('winner');
    
    const rank = document.createElement('div');
    rank.className = 'rank';
    rank.textContent = `#${index + 1}`;
    
    const img = document.createElement('img');
    img.src = drawing.image;
    img.alt = `Drawing by ${drawing.username}`;
    
    const username = document.createElement('div');
    username.className = 'username';
    username.textContent = drawing.username;
    
    const pfp = document.createElement('img');
    pfp.src = drawing.pfp;
    pfp.alt = `${drawing.username}'s profile picture`;
    pfp.className = 'pfp';
    
    const votes = document.createElement('div');
    votes.className = 'votes';
    votes.textContent = `${drawing.votes} vote${drawing.votes !== 1 ? 's' : ''}`;
    
    rankingItem.appendChild(rank);
    rankingItem.appendChild(pfp);
    rankingItem.appendChild(img);
    rankingItem.appendChild(username);
    rankingItem.appendChild(votes);
    
    if (index === 0) {
      const crown = document.createElement('div');
      crown.className = 'crown';
      crown.innerHTML = '👑';
      rankingItem.appendChild(crown);
    }

    return rankingItem;
  }

  nextRound() {
    this.currentRound++;
    if (this.currentRound <= this.maxRounds) {
      this.resetCanvas();
      this.rankingContainer.classList.remove('active');
      this.rankingContainer.classList.add('hidden');
      this.startGame();
    } else {
      this.showFinalResults();
    }
  }

  resetCanvas() {
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = this.currentSize;
    this.history = [];
    this.redoStack = [];
  }

  startNewGame() {
    this.currentRound = 1;
    this.resetCanvas();
    this.rankingContainer.classList.remove('active');
    this.rankingContainer.classList.add('hidden');
    this.startGame();
  }

  showFinalResults() {
    const players = this.currentDrawings.map(drawing => ({
      name: drawing.username,
      score: drawing.votes,
      avatar: drawing.pfp
    }));
    
    showEndGameCurtains(players);
  }

  addToHistory() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.history.push(imageData);
    this.redoStack = [];
    if (this.history.length > 20) this.history.shift();
  }

  undo() {
    if (this.history.length > 1) {
      const currentState = this.history.pop();
      this.redoStack.push(currentState);
      const previousState = this.history[this.history.length - 1];
      this.ctx.putImageData(previousState, 0, 0);
    }
  }

  redo() {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop();
      this.history.push(nextState);
      this.ctx.putImageData(nextState, 0, 0);
    }
  }
}

window.onload = () => {
  preloadCurtains();
  window.game = new DrawingGame();
};