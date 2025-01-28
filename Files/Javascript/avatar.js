// Avatar selection logic
let currentIndex = 0;
export const avatars = [
    { name: "Jean-Paul", image: "/static/images/avatar/1.png" },
    { name: "Jean-Paulette", image: "/static/images/avatar/2.png" },
    { name: "Jean-Paulo", image: "/static/images/avatar/3.png" },
    { name: "Jean-Paulin", image: "/static/images/avatar/4.png" },
    { name: "Jean-Paulito", image: "/static/images/avatar/5.png" },
    { name: "Jean-Paulon", image: "/static/images/avatar/6.png" },
    { name: "⍜⏁-⏁⊑⟒", image: "/static/images/avatar/7.png" },
    { name: "Jean-Paulard", image: "/static/images/avatar/8.png" },
    { name: "Jean-Paulenta", image: "/static/images/avatar/9.png" },
    { name: "Jean-Pauline", image: "/static/images/avatar/10.png" },
    { name: "Jean-Paulotonia", image: "/static/images/avatar/11.png" },

];

const profileImage = document.querySelector('.profile-image');
const speechBubble = document.querySelector('.speech-bubble p');

function updateProfile() {
    profileImage.src = avatars[currentIndex].image;
    speechBubble.textContent = `Son nom est ${avatars[currentIndex].name}`;
}

// Previous and next buttons to change avatar
document.querySelector('.nav-button.prev').addEventListener('click', (e) => {
    e.preventDefault();
    currentIndex = currentIndex === 0 ? avatars.length - 1 : currentIndex - 1;
    updateProfile();
});

document.querySelector('.nav-button.next').addEventListener('click', (e) => {
    e.preventDefault();
    currentIndex = currentIndex === avatars.length - 1 ? 0 : currentIndex + 1;
    updateProfile();
});

// Initialize with first avatar
updateProfile();