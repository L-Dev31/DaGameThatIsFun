document.addEventListener("DOMContentLoaded", function() {
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
        // Recharge la vidéo pour prendre en compte la nouvelle source
        introVideo.load();
    }

    setTimeout(() => {
        document.getElementById("loading-screen").style.display = "none";
        videoPopup.style.display = "flex";
    }, 2000);

    yesButton.addEventListener("click", function() {
        videoPopup.style.display = "none";
        introVideo.style.display = "flex";
        // Forcer la lecture avec le son
        introVideo.muted = false;
        introVideo.play();
        // Redirection à la fin de la vidéo
        introVideo.onended = () => window.location.href = `../${game}/${game}.html`;
    });

    noButton.addEventListener("click", function() {
        videoPopup.style.display = "none";
        window.location.href = `../${game}/${game}.html`;
    });
});
