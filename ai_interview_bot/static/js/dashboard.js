document.addEventListener("DOMContentLoaded", () => {
  // Highlight active navigation link
  const path = window.location.pathname;
  document.querySelectorAll(".nav-links a").forEach((link) => {
    if (link.getAttribute("href") === path) {
      link.style.fontWeight = "700";
      link.style.color = "#1d4ed8";
    }
  });
});
