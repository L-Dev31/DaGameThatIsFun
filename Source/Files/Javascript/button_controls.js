export function initShareButton() {
  const shareButton = document.getElementById("shareToggle");
  const qrCodeModal = document.getElementById("qrCodeModal");
  const qrCodeUrl = document.getElementById("qrCodeUrl");
  const qrCodeImage = document.getElementById("qrCodeImage");
  if (!shareButton || !qrCodeModal || !qrCodeUrl || !qrCodeImage) return;
  shareButton.addEventListener("click", async () => {
    try {
      const response = await fetch('/get_ip');
      if (!response.ok) {
        console.error("Erreur lors de la récupération des infos QR");
        return;
      }
      const data = await response.json();
      const url = data.url;
      const qr_code = data.qr_code;
      qrCodeUrl.textContent = url;
      qrCodeImage.src = "data:image/png;base64," + qr_code;
      qrCodeModal.classList.add("active");
    } catch (err) {
      console.error("Erreur lors de l'appel /get_ip", err);
    }
  });
  const copyButton = qrCodeModal.querySelector(".modal-button-secondary");
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      try {
        const textToCopy = qrCodeUrl.textContent;
        await navigator.clipboard.writeText(textToCopy);
        alert("Lien copié !");
      } catch (err) {
        console.error("Erreur lors de la copie du lien :", err);
      }
    });
  }
  const closeButton = qrCodeModal.querySelector(".modal-button-primary");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      qrCodeModal.classList.remove("active");
    });
  }
}
