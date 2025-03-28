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

    if (!isOwner) {
        yesButton.disabled = true;
        noButton.disabled = true;
    }

    if (isOwner) {
        videoPopup.style.display = "flex";
        yesButton.addEventListener("click", async function() {
            videoPopup.style.display = "none";
            LobbyManager.sendCommandToPlayers('show-video', { game: game });
            playVideo();
        });
        noButton.addEventListener("click", async function() {
            videoPopup.style.display = "none";
            await LobbyManager.sendCommandToPlayers('redirect', { url: `../${game}/${game}.html` });
        });
    }

    document.addEventListener("show-video-popup", () => {
        playVideo();
    });

    function playVideo() {
        introVideo.style.display = "block";
        introVideo.style.width = "100%";
        introVideo.style.height = "auto";
        introVideo.muted = false;
        introVideo.play();
        introVideo.onended = async () => {
            await LobbyManager.sendCommandToPlayers('redirect', { url: `../${game}/${game}.html&roomCode=${roomCode}` });
        };
    }
});
