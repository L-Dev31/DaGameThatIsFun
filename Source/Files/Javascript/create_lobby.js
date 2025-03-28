import { avatars } from './avatar.js';

let currentAvatarIndex = 0;

function updateAvatarDisplay() {
    const avatarImage = document.getElementById('avatarImage');
    const avatarName = document.getElementById('avatarName');
    avatarImage.src = avatars[currentAvatarIndex].image; // Problème potentiel ici
    avatarName.textContent = avatars[currentAvatarIndex].name; // Problème signalé ici
}


document.addEventListener('DOMContentLoaded', () => {
    updateAvatarDisplay();

    document.getElementById('prevAvatar').addEventListener('click', () => {
        currentAvatarIndex = (currentAvatarIndex - 1 + avatars.length) % avatars.length;
        updateAvatarDisplay();
    });

    document.getElementById('nextAvatar').addEventListener('click', () => {
        currentAvatarIndex = (currentAvatarIndex + 1) % avatars.length;
        updateAvatarDisplay();
    });

    const passwordToggle = document.getElementById('passwordToggle');
    const passwordInput = document.getElementById('passwordInput');
    passwordInput.style.display = 'none';

    passwordToggle.addEventListener('change', (e) => {
        const passwordField = document.getElementById('password');
        if (e.target.checked) {
            passwordInput.style.display = 'block';
            passwordField.required = true;
        } else {
            passwordInput.style.display = 'none';
            passwordField.required = false;
            passwordField.value = '';
        }
    });

    document.getElementById('createLobbyForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const playerName = document.getElementById('playerName').value;
        const password = passwordToggle.checked
            ? document.getElementById('password').value
            : null;

        const avatarIndex = currentAvatarIndex;

        try {
            const response = await fetch('/api/lobby/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    playerName,
                    password,
                    avatarIndex,
                }),
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('roomCode', data.roomCode);
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('playerName', playerName);
                localStorage.setItem('playerAvatarIndex', avatarIndex);
                window.location.href = `waiting_room.html?roomCode=${data.roomCode}`;
            } else {
                alert('Erreur lors de la création du salon : ' + data.message);
            }
        } catch (error) {
            alert('Une erreur s\'est produite. Veuillez réessayer.');
        }
    });
});