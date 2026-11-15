(() => {
  const studio = document.querySelector(".voice-studio");
  if (!studio) return;

  const attemptId = Number(studio.getAttribute("data-attempt-id"));
  const qText = document.getElementById("current-question-text");
  const counter = document.getElementById("question-counter");
  const transcriptEl = document.getElementById("voice-transcript");
  const micBtn = document.getElementById("start-mic-btn");
  const replayBtn = document.getElementById("replay-prompt-btn");
  const muteBtn = document.getElementById("mute-btn");
  const submitBtn = document.getElementById("submit-voice-btn");
  const statusEl = document.getElementById("mic-status");
  const feedbackBox = document.getElementById("voice-feedback-box");
  const timerEl = document.getElementById("voice-timer");
  const canvas = document.getElementById("voice-waveform");
  const ctx = canvas ? canvas.getContext("2d") : null;

  let elapsed = 0;
  let muted = false;
  let recognition = null;
  let listening = false;

  setInterval(() => {
    elapsed += 1;
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
  }, 1000);

  function speakQuestion(text) {
    if (muted || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.98;
    window.speechSynthesis.speak(utter);
  }

  function drawWave() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bars = 28;
    const w = canvas.width / bars;
    const now = Date.now() / 180;
    for (let i = 0; i < bars; i++) {
      const amp = listening ? 22 + Math.sin(now + i * 0.6) * 16 : 8 + Math.sin(now + i * 0.3) * 4;
      ctx.fillStyle = listening ? "#2563eb" : "#94a3b8";
      ctx.fillRect(i * w + 4, (canvas.height - amp) / 2, w - 8, amp);
    }
    requestAnimationFrame(drawWave);
  }
  drawWave();

  if (qText) speakQuestion(qText.textContent || "");

  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      muted = !muted;
      muteBtn.textContent = muted ? "Unmute Voice" : "Mute Voice";
      if (muted && "speechSynthesis" in window) window.speechSynthesis.cancel();
    });
  }

  if (replayBtn && qText) {
    replayBtn.addEventListener("click", () => speakQuestion(qText.textContent || ""));
  }

  if (micBtn) {
    micBtn.addEventListener("click", () => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        statusEl.textContent = "Speech recognition unavailable in this browser. Please type your answer below.";
        return;
      }
      if (listening && recognition) {
        recognition.stop();
        listening = false;
        micBtn.textContent = "Start Speaking";
        return;
      }
      recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let text = "";
        for (let i = 0; i < event.results.length; i++) {
          text += event.results[i][0].transcript + " ";
        }
        transcriptEl.value = text.trim();
      };
      recognition.onerror = () => {
        listening = false;
        micBtn.textContent = "Start Speaking";
        statusEl.textContent = "Microphone unavailable or denied. You can type your response directly.";
      };
      recognition.start();
      listening = true;
      micBtn.textContent = "Stop Recording";
      statusEl.textContent = "Listening... speak clearly into your microphone.";
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      const answer = transcriptEl.value.trim();
      if (!answer) {
        statusEl.textContent = "Please speak or type an answer before submitting.";
        return;
      }
      const res = await fetch("/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId, answer, duration_seconds: elapsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        statusEl.textContent = data.error || "Unable to evaluate response.";
        return;
      }
      const ev = data.evaluation;
      feedbackBox.style.display = "block";
      feedbackBox.innerHTML = `
        <p class="muted">${ev.evaluation_label}</p>
        <h3>Score: ${ev.score} / ${ev.max_score}</h3>
        <p><strong>Strengths:</strong> ${(ev.strengths || []).join(" ")}</p>
        <p><strong>Improvements:</strong> ${(ev.suggested_improvements || []).join(" ")}</p>
        <button type="button" id="next-voice-q" class="btn btn-primary" style="margin-top:1rem;">Next Question</button>
      `;
      document.getElementById("next-voice-q").addEventListener("click", async () => {
        const nextRes = await fetch("/api/interview/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attempt_id: attemptId, duration_seconds: elapsed }),
        });
        const nextData = await nextRes.json();
        if (nextData.completed) {
          window.location.href = `/result/${attemptId}`;
          return;
        }
        qText.textContent = nextData.question.prompt;
        counter.textContent = `Question ${nextData.current_index + 1}`;
        transcriptEl.value = "";
        feedbackBox.style.display = "none";
        speakQuestion(nextData.question.prompt);
      });
    });
  }
})();
