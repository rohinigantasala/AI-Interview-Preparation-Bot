document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("answer-box");
  const counter = document.getElementById("word-counter");
  const form = document.getElementById("answer-form");
  const clientError = document.getElementById("client-error");

  if (textarea && counter) {
    const updateCount = () => {
      const text = textarea.value.trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      counter.textContent = `${words} ${words === 1 ? "word" : "words"}`;
    };
    textarea.addEventListener("input", () => {
      updateCount();
      if (clientError) {
        clientError.classList.add("hidden");
        clientError.textContent = "";
      }
    });
    updateCount();
  }

  if (form && textarea && clientError) {
    form.addEventListener("submit", (event) => {
      if (!textarea.value.trim()) {
        event.preventDefault();
        clientError.textContent =
          "Please enter an answer before submitting. Empty answers are not allowed.";
        clientError.classList.remove("hidden");
      }
    });
  }
});
