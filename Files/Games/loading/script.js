import { LobbyManager } from '/Javascript/lobby_manager.js';

document.addEventListener("DOMContentLoaded", async function() {
    const params = new URLSearchParams(window.location.search);
    const game = params.get("game");
    const loadingImage = document.getElementById("loading-image");
    const videoSource = document.getElementById("video-source");
    const videoPopup = document.getElementById("video-popup-overlay");
    const introVideo = document.getElementById("intro-video");
    const yesButton = document.getElementById("yes-button");
    const noButton = document.getElementById("no-button");

    if (game) {
        loadingImage.src = `images/loadImage/${game}.gif`;
        videoSource.src = `images/introVideo/${game}.mp4`;
        introVideo.load();
    }

    // Initialiser le LobbyManager
    LobbyManager.init();

    // Vérifier si l'utilisateur est dans un lobby et s'il est propriétaire
    const inLobby = !!localStorage.getItem("roomCode");
    const isOwner = inLobby ? await LobbyManager.isCurrentUserOwner() : false;

    // Écouter les commandes pour afficher la popup vidéo
    document.addEventListener('show-video-popup', () => {
        document.getElementById("loading-screen").style.display = "none";
        videoPopup.style.display = "flex";
    });

    // Si l'utilisateur est propriétaire, afficher la popup vidéo après un court délai
    if (isOwner) {
        setTimeout(() => {
            LobbyManager.sendCommandToPlayers('show-video');
        }, 3000);
    }

    // Bouton "Oui" - Jouer la vidéo et rediriger
    yesButton.addEventListener("click", async function() {
        videoPopup.style.display = "none";
        introVideo.style.display = "flex";
        introVideo.muted = false;
        introVideo.play();

        // Envoyer une commande pour rediriger tous les joueurs après la fin de la vidéo
        introVideo.onended = async () => {
            if (isOwner) {
                await LobbyManager.sendCommandToPlayers('redirect', {
                    url: `../${game}/${game}.html`
                });
            }
        };
    });

    // Bouton "Non" - Rediriger sans jouer la vidéo
    noButton.addEventListener("click", async function() {
        videoPopup.style.display = "none";

        // Envoyer une commande pour rediriger tous les joueurs
        if (isOwner) {
            await LobbyManager.sendCommandToPlayers('redirect', {
                url: `../${game}/${game}.html`
            });
        }
    });

    // Si l'utilisateur n'est pas propriétaire, désactiver les boutons
    if (!isOwner) {
        yesButton.disabled = true;
        noButton.disabled = true;
    }
});