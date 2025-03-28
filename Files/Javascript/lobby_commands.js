export const lobbyCommands = {
  _logCommand: (commandName, payload) => {
    console.log(`[COMMAND] Commande ${commandName} reçue`, payload);
  },

  "redirect": (payload, manager) => {
    lobbyCommands._logCommand("redirect", payload);
    
    // Vérification simple pour éviter les redirections en boucle
    const currentPath = window.location.pathname;
    const targetPath = payload.url;
    
    // Extraire le nom de base des chemins (sans extension ni slash)
    const getCurrentBasePath = (path) => {
      // Supprimer les slashes au début et à la fin
      let cleanPath = path.replace(/^\/|\/$/g, '');
      // Supprimer l'extension .html si présente
      cleanPath = cleanPath.replace(/\.html$/, '');
      // Obtenir le dernier segment du chemin (après le dernier slash)
      const segments = cleanPath.split('/');
      return segments[segments.length - 1].toLowerCase();
    };
    
    const currentBasePath = getCurrentBasePath(currentPath);
    const targetBasePath = getCurrentBasePath(targetPath);
    
    // Vérifier si nous sommes déjà sur la page cible (en comparant les noms de base)
    if (currentBasePath === targetBasePath) {
      console.log("[COMMAND] Redirection ignorée: déjà sur la page cible");
      return;
    }
    
    // Vérifier si nous avons récemment redirigé vers cette page
    const lastRedirectTime = sessionStorage.getItem(`lastRedirect_${targetBasePath}`);
    const now = Date.now();
    if (lastRedirectTime && (now - parseInt(lastRedirectTime)) < 2000) {
      console.log("[COMMAND] Redirection ignorée: redirection récente vers cette page");
      return;
    }
    
    // Procéder à la redirection
    console.log("[COMMAND] Redirection autorisée vers:", payload.url);
    sessionStorage.setItem('isRedirecting', 'true');
    sessionStorage.setItem(`lastRedirect_${targetBasePath}`, now.toString());
    window.location.href = payload.url;
  },

  "start-countdown": (payload) => {
    lobbyCommands._logCommand("start-countdown", payload);
    document.dispatchEvent(new CustomEvent("start-countdown", { detail: payload }));
    
    try {
      const countdownDiv = document.createElement('div');
      countdownDiv.id = 'countdown';
      document.body.appendChild(countdownDiv);
      
      let countdown = payload.duration || 5;
      countdownDiv.textContent = `La partie commence dans ${countdown} secondes...`;
      const countdownInterval = setInterval(() => {
        countdown--;
        countdownDiv.textContent = `La partie commence dans ${countdown} secondes...`;
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          countdownDiv.remove();
        }
      }, 1000);
    } catch (error) {
      console.error("[ERROR] Erreur lors de l'affichage du compte à rebours:", error);
    }
  },

  "cancel-countdown": (payload) => {
    lobbyCommands._logCommand("cancel-countdown", payload);
    document.dispatchEvent(new Event("cancel-countdown"));
    const countdownDiv = document.getElementById('countdown');
    if (countdownDiv) countdownDiv.remove();
  },

  "lobby-deleted": (payload, manager) => {
    lobbyCommands._logCommand("lobby-deleted", payload);
    alert("Le salon a été supprimé par l'hôte !");
    localStorage.removeItem("roomCode");
    localStorage.removeItem("userId");
    if (manager) manager.stopPolling();
    window.location.href = "/";
  },

  "show-video": (payload) => {
    lobbyCommands._logCommand("show-video", payload);
    document.dispatchEvent(new Event('show-video-popup'));
  },

  "player-ready": (payload) => {
    lobbyCommands._logCommand("player-ready", payload);
    try {
      // Ajouter le joueur à la liste des joueurs prêts dans la session
      if (!window.readyPlayers) {
        window.readyPlayers = [];
      }
      
      // Si le payload contient une liste de joueurs prêts, la fusionner avec la liste existante
      if (payload.readyPlayers && Array.isArray(payload.readyPlayers)) {
        window.readyPlayers = [...new Set([...window.readyPlayers, ...payload.readyPlayers])];
        console.log("[COMMAND] Liste des joueurs prêts mise à jour depuis le payload:", window.readyPlayers);
      }
      
      // Ajouter le joueur actuel s'il n'est pas déjà dans la liste
      if (!window.readyPlayers.includes(payload.playerId)) {
        window.readyPlayers.push(payload.playerId);
        console.log(`[COMMAND] Joueur ${payload.playerId} ajouté à la liste des joueurs prêts`);
      }
      
      // Mettre à jour l'opacité de tous les joueurs
      document.querySelectorAll('.player').forEach(playerDiv => {
        const playerId = playerDiv.dataset.playerId;
        if (playerId && window.readyPlayers.includes(playerId)) {
          playerDiv.style.opacity = '1';
          console.log(`[COMMAND] Opacité du joueur ${playerId} mise à jour`);
        }
      });
      
      // Jouer le son pour le joueur qui vient de se déclarer prêt
      const selectSound = new Audio('/static/music/pop.mp3');
      selectSound.play().catch(error => console.error("[ERROR] Erreur son:", error));
      
      document.dispatchEvent(new CustomEvent('player-ready', { detail: { ...payload, readyPlayers: window.readyPlayers } }));
    } catch (error) {
      console.error("[ERROR] Erreur player-ready:", error);
    }
  },

  "start-game": (payload) => {
    lobbyCommands._logCommand("start-game", payload);
    const startButton = document.getElementById('start-button');
    if (startButton) startButton.style.display = 'none';
    
    // Afficher le contenu du quiz pour tous les joueurs
    const quizContent = document.getElementById('quiz-content');
    if (quizContent) {
      quizContent.style.display = 'block';
      console.log("[COMMAND] Affichage du contenu du quiz pour tous les joueurs");
    }
    
    // Initialiser le quiz pour tous les joueurs, pas seulement l'owner
    if (typeof window.initQuiz === 'function') {
      console.log("[COMMAND] Initialisation du quiz pour tous les joueurs");
      window.initQuiz();
    } else {
      console.error("[ERROR] La fonction initQuiz n'est pas disponible");
    }
  },

  "send-question": (payload) => {
    lobbyCommands._logCommand("send-question", payload);
    try {
      // Stocker les données de la question pour tous les joueurs
      window.quizData = {
        question: payload.question,
        category: payload.category
      };
      window.currentQuestionIndex = payload.questionIndex;
      
      // Stocker les questions utilisées pour éviter les répétitions
      if (!window.usedQuestions) {
        window.usedQuestions = [];
      }
      if (payload.usedQuestionIndex !== undefined && !window.usedQuestions.includes(payload.usedQuestionIndex)) {
        window.usedQuestions.push(payload.usedQuestionIndex);
      }
      
      // S'assurer que tous les joueurs voient la même question
      if (typeof window.displayQuestion === 'function') {
        window.displayQuestion(window.quizData);
      } else {
        console.error("[ERROR] La fonction displayQuestion n'est pas disponible globalement");
      }
      
      // Déclencher un événement pour informer le reste de l'application
      document.dispatchEvent(new CustomEvent('question-received', { 
        detail: window.quizData 
      }));
    } catch (error) {
      console.error("[ERROR] Erreur send-question:", error);
    }
  },

  "timer-sync": (payload) => {
    // Pas de log pour timer-sync pour éviter de surcharger la console
    try {
      const timerBar = document.getElementById('timer-bar');
      if (timerBar) {
        requestAnimationFrame(() => {
          timerBar.style.transition = 'none';
          timerBar.style.transform = `scaleX(${payload.progress})`;
          
          const remainingTime = (1 - payload.progress) * 20;
          setTimeout(() => {
            if (remainingTime > 0) {
              timerBar.style.transition = `transform ${remainingTime}s linear`;
              timerBar.style.transform = 'scaleX(1)';
            }
          }, 16);
        });
      }
    } catch (error) {
      console.error("[ERROR] Erreur timer-sync:", error);
    }
  },

  "player-answer": (payload) => {
    lobbyCommands._logCommand("player-answer", payload);
    try {
      const answers = document.querySelectorAll('.answer');
      if (payload.answerIndex >= 0 && payload.answerIndex < answers.length) {
        const answerElement = answers[payload.answerIndex];
        const playerIndex = payload.playerIndex;
        
        if (playerIndex !== -1 && window.players && window.players[playerIndex]) {
          // Supprimer tous les marqueurs existants pour ce joueur sur toutes les réponses
          document.querySelectorAll(`.player-marker[data-player-index="${playerIndex}"]`).forEach(marker => {
            marker.remove();
          });
          
          // Créer un nouveau marqueur avec l'avatar du joueur
          let marker = document.createElement('img');
          marker.src = window.players[playerIndex].avatar || `/static/images/avatar/${playerIndex + 1}.png`;
          marker.className = 'player-marker';
          marker.dataset.playerIndex = playerIndex;
          marker.dataset.playerId = window.players[playerIndex].id;
          marker.dataset.responseTime = payload.responseTime.toString();
          answerElement.appendChild(marker);
          
          // Jouer un son lors de la sélection
          const selectSound = new Audio('/static/music/pop.mp3');
          selectSound.play().catch(error => {});
          
          // Mettre à jour la position des marqueurs
          if (typeof window.updateMarkerPositions === 'function') {
            window.updateMarkerPositions(answerElement);
          } else if (typeof updateMarkerPositions === 'function') {
            updateMarkerPositions(answerElement);
          }
          
          // Si c'est le joueur actuel, marquer la réponse comme sélectionnée
          const userId = localStorage.getItem("userId");
          if (payload.playerId === userId) {
            document.querySelectorAll('.answer').forEach(a => a.classList.remove('selected'));
            answerElement.classList.add('selected');
          }
          
          // Déclencher un événement personnalisé pour informer le reste de l'application
          document.dispatchEvent(new CustomEvent('player-answer-updated', { 
            detail: { 
              playerId: payload.playerId,
              playerIndex: playerIndex,
              answerIndex: payload.answerIndex,
              responseTime: payload.responseTime
            } 
          }));
          
          // Forcer la mise à jour des scores pour tous les joueurs
          if (typeof window.validateAnswers === 'function' && window.quizData && window.quizData.question && window.quizData.question.correct) {
            if (answerElement.textContent.trim() === window.quizData.question.correct.trim()) {
              // Mettre à jour les scores immédiatement si c'est la bonne réponse
              if (typeof window.updateScores === 'function') {
                setTimeout(() => {
                  window.updateScores();
                }, 500);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[ERROR] Erreur player-answer:", error);
    }
  },

  "update-scores": (payload) => {
    lobbyCommands._logCommand("update-scores", payload);
    try {
      // Mettre à jour les scores dans l'objet players global
      if (!window.players) {
        console.error("[ERROR] window.players n'est pas défini");
        return;
      }
      
      payload.players.forEach(playerScore => {
        const playerIndex = window.players.findIndex(p => p.id === playerScore.id);
        if (playerIndex !== -1) {
          // Ajouter une animation seulement si le score a changé
          const oldScore = window.players[playerIndex].score;
          window.players[playerIndex].score = playerScore.score;
          
          // Mettre à jour l'élément de score dans le DOM
          const playerContainers = document.querySelectorAll('#players-container .player');
          playerContainers.forEach(container => {
            const playerId = container.dataset.playerId;
            if (playerId === playerScore.id) {
              const scoreElement = container.querySelector('.player-score');
              if (scoreElement) {
                scoreElement.textContent = playerScore.score;
                
                // Ajouter une animation si le score a augmenté
                if (playerScore.score > oldScore) {
                  scoreElement.classList.add('score-updated');
                  setTimeout(() => {
                    scoreElement.classList.remove('score-updated');
                  }, 1500);
                }
              }
            }
          });
        }
      });
      
      // Déclencher un événement pour informer le reste de l'application
      document.dispatchEvent(new CustomEvent('scores-updated', { 
        detail: { players: payload.players } 
      }));
    } catch (error) {
      console.error("[ERROR] Erreur update-scores:", error);
    }
  },

  "next-question": (payload) => {
    lobbyCommands._logCommand("next-question", payload);
    try {
      window.currentQuestionIndex = payload.currentQuestionIndex;
      
      // Appliquer le style correct/incorrect aux réponses pour tous les joueurs
      if (window.quizData && window.quizData.question && window.quizData.question.correct) {
        const correctAnswer = window.quizData.question.correct;
        
        document.querySelectorAll('.answer').forEach(answer => {
          if (answer.textContent.trim() === correctAnswer.trim()) {
            answer.classList.add('correct');
            answer.style.backgroundColor = 'gold';
            answer.style.opacity = '1';
          } else {
            answer.classList.add('wrong');
          }
        });
      }
    } catch (error) {
      console.error("[ERROR] Erreur next-question:", error);
    }
  },

  "show-credits": (payload) => {
    lobbyCommands._logCommand("show-credits", payload);
    try {
      // Vérifier si les crédits sont déjà affichés pour éviter la superposition
      if (document.getElementById('credits-container')) {
        console.error("[ERROR] Les crédits sont déjà affichés, ignoré pour éviter la superposition");
        return;
      }
      
      // Nettoyer tout affichage précédent
      const existingCurtains = document.querySelectorAll('#left-curtain, #right-curtain');
      existingCurtains.forEach(curtain => curtain.remove());
      
      // Précharger et afficher les crédits avec un délai synchronisé
      window.preloadCurtains();
      
      // Utiliser setTimeout pour synchroniser l'affichage des crédits entre tous les joueurs
      setTimeout(() => {
        window.showEndGameCurtains(payload.players);
      }, 500);
    } catch (error) {
      console.error("[ERROR] Erreur lors de l'affichage des crédits:", error);
    }
  },

  "exit-credits": (payload) => {
    lobbyCommands._logCommand("exit-credits", payload);
    window.location.href = payload.redirect || '/index.html';
  }
};
