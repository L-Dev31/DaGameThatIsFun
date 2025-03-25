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

    LobbyManager.init();

    const inLobby = !!localStorage.getItem("roomCode");
    const isOwner = inLobby ? await LobbyManager.isCurrentUserOwner() : false;

    if (isOwner) {
        setTimeout(() => {
            LobbyManager.sendCommandToPlayers('show-video', {
                ownerId: localStorage.getItem("userId"),
                game: game
            });
        }, 100);
    }

    yesButton.addEventListener("click", async function() {
        videoPopup.style.display = "none";
        introVideo.style.display = "flex";
        introVideo.muted = false;
        introVideo.play();
        introVideo.onended = async () => {
            await LobbyManager.sendCommandToPlayers('redirect', {
                url: `../${game}/${game}.html`
            });
        };
    });

    noButton.addEventListener("click", async function() {
        videoPopup.style.display = "none";
        await LobbyManager.sendCommandToPlayers('redirect', {
            url: `../${game}/${game}.html`
        });
    });
});