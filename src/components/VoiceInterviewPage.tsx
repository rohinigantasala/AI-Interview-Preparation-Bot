import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { countWords, formatDuration } from '../lib/scoring';
import type { ActiveInterviewSession, AuthUser, QuestionEvaluation } from '../lib/types';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface VoiceInterviewPageProps {
  user: AuthUser;
  session: ActiveInterviewSession | null;
  submitting: boolean;
  serverError: string | null;
  onSubmitAnswer: (answer: string, durationSeconds: number) => Promise<QuestionEvaluation | null>;
  onNextQuestion: (durationSeconds: number) => Promise<void>;
  onEndInterview: (durationSeconds: number) => Promise<void>;
}

export function VoiceInterviewPage({
  user,
  session,
  submitting,
  serverError,
  onSubmitAnswer,
  onNextQuestion,
  onEndInterview,
}: VoiceInterviewPageProps) {
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [latestEvaluation, setLatestEvaluation] = useState<QuestionEvaluation | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const currentQuestion = session?.questions[session.currentIndex];
  const currentNum = (session?.currentIndex ?? 0) + 1;
  const totalQuestions = session?.questionCount ?? 5;

  // Interview timer
  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Stop audio & speech recognition on unmount
  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors
    }
    recognitionRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
      analyserRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopListening();
    };
  }, [stopListening]);

  // Speak text using SpeechSynthesis
  const speakPrompt = useCallback(
    (text: string) => {
      if (isMuted || !('speechSynthesis' in window)) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.onstart = () => setIsSpeaking(true);
        utter.onend = () => setIsSpeaking(false);
        utter.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
      } catch {
        setIsSpeaking(false);
      }
    },
    [isMuted],
  );

  // Initial greeting speech
  useEffect(() => {
    if (!hasGreeted && session) {
      speakPrompt(
        `Hello ${user.fullName}! Welcome to your mock interview. I'm Elena, your AI interviewer today. Are you ready to begin?`,
      );
    }
  }, [hasGreeted, session, speakPrompt, user.fullName]);

  // Speak question whenever advancing to a new question after greeting
  useEffect(() => {
    if (hasGreeted && currentQuestion && !latestEvaluation) {
      speakPrompt(currentQuestion.prompt);
    }
  }, [hasGreeted, currentQuestion?.id, currentQuestion?.prompt, latestEvaluation, speakPrompt]);

  // Live animated waveform canvas (real microphone FFT when listening, harmonic wave when AI speaking)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    const freqData = new Uint8Array(64);

    const renderWave = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = 48;
      const gap = w / bars;
      const barWidth = Math.max(3, gap * 0.55);

      if (isListening && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqData);
      }

      for (let i = 0; i < bars; i++) {
        const norm = i / bars;
        const envelope = Math.sin(norm * Math.PI);
        let intensity = 0.12;

        if (isListening && analyserRef.current) {
          const bin = freqData[i % freqData.length] ?? 0;
          intensity = Math.max(0.15, (bin / 255) * 0.95);
        } else if (isListening) {
          intensity =
            Math.abs(Math.sin(phase * 1.4 + i * 0.45)) * 0.72 + 0.16;
        } else if (isSpeaking) {
          intensity =
            Math.abs(Math.sin(phase * 1.1 + i * 0.35)) * 0.8 + 0.18;
        } else {
          intensity =
            Math.abs(Math.sin(phase * 0.55 + i * 0.28)) * 0.36 + 0.16;
        }

        const barHeight = Math.max(8, intensity * envelope * (h - 10));
        const x = i * gap + (gap - barWidth) / 2;
        const y = (h - barHeight) / 2;

        ctx.fillStyle = isListening
          ? '#38BDF8'
          : isSpeaking
            ? '#818CF8'
            : '#60A5FA';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 4);
        ctx.fill();
      }

      phase += isListening || isSpeaking ? 0.12 : 0.035;
      rafId = window.requestAnimationFrame(renderWave);
    };

    rafId = window.requestAnimationFrame(renderWave);
    return () => window.cancelAnimationFrame(rafId);
  }, [hasGreeted, latestEvaluation, isListening, isSpeaking]);

  const startListening = async () => {
    setMicError(null);
    setLocalError(null);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);

    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setMicError(
        'Browser speech recognition is not supported in this browser. Use the text response fallback below to type and submit your answer.',
      );
      return;
    }

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 128;
          source.connect(analyser);
          audioCtxRef.current = audioCtx;
          analyserRef.current = analyser;
        }
      }
    } catch (err) {
      const errName = err instanceof DOMException ? err.name : '';
      if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setMicError(
          'No microphone hardware was detected on this device. Connect a headset/mic and click Start Speaking again, or type your response in the box below.',
        );
      } else {
        setMicError(
          'Microphone access is currently blocked. Click the lock/tune icon beside your browser address bar, set Microphone to Allow, and click Start Speaking again — or open this app in a full browser tab to grant mic permission.',
        );
      }
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += piece + ' ';
          } else {
            interimChunk += piece;
          }
        }
        if (finalChunk) {
          setTranscript((prev) => (prev ? `${prev.trim()} ${finalChunk.trim()}` : finalChunk.trim()));
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'audio-capture') {
          setMicError(
            'Microphone access is unavailable. You can type your response directly in the transcript box below.',
          );
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setMicError(
        'Could not start speech recognition. Please type your response in the text fallback box below.',
      );
      stopListening();
    }
  };

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      void startListening();
    }
  };

  const handleToggleMute = () => {
    if (!isMuted) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
    setIsMuted((prev) => !prev);
  };

  const handleSubmit = async () => {
    const combined = `${transcript} ${interimTranscript}`.trim();
    if (!combined) {
      setLocalError('Please speak into your microphone or type an answer before submitting.');
      return;
    }
    stopListening();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setLocalError(null);

    const evaluation = await onSubmitAnswer(combined, elapsedSeconds);
    if (evaluation) {
      setLatestEvaluation(evaluation);
      setTranscript('');
      setInterimTranscript('');
    }
  };

  const handleContinueNext = async () => {
    setLatestEvaluation(null);
    setTranscript('');
    setInterimTranscript('');
    await onNextQuestion(elapsedSeconds);
  };

  if (!session || !currentQuestion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-slate-600">Loading voice interview studio...</p>
      </div>
    );
  }

  const progressPct = Math.round((currentNum / totalQuestions) * 100);
  const fullText = `${transcript}${interimTranscript ? ' ' + interimTranscript : ''}`.trim();

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#08102D] text-white">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
        {/* Top Studio Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
          <div className="flex items-center gap-3.5">
            <img
              src="/src/assets/images/ai_interviewer_avatar_1794739756686.jpg"
              alt="Elena Vance AI interviewer"
              referrerPolicy="no-referrer"
              className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-400/60"
            />
            <div>
              <p className="font-display text-sm font-bold text-white">Elena Vance · AI Interviewer</p>
              <p className="text-xs text-blue-200">
                {session.interviewType.toUpperCase()} · {currentQuestion.category} ·{' '}
                <span className="font-mono">
                  Question {currentNum} of {totalQuestions}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              data-testid="voice-timer"
              className="rounded-lg border border-white/15 bg-slate-900/60 px-3 py-1.5 font-mono text-xs font-semibold text-blue-200 tabular-nums"
            >
              {formatDuration(elapsedSeconds)}
            </span>

            <button
              type="button"
              onClick={handleToggleMute}
              aria-label={isMuted ? 'Unmute AI interviewer voice' : 'Mute AI interviewer voice'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white hover:bg-white/20 cursor-pointer"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 bg-red-500/15 px-3.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/25 cursor-pointer"
            >
              <PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
              End Interview
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          role="progressbar"
          aria-valuenow={currentNum}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-400 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Greeting Step OR Active Question */}
        {!hasGreeted ? (
          <div className="mt-8 rounded-3xl border border-white/15 bg-white/5 p-8 text-center backdrop-blur-md">
            <img
              src="/src/assets/images/ai_interviewer_avatar_1794739756686.jpg"
              alt="Elena Vance AI interviewer"
              referrerPolicy="no-referrer"
              className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-blue-500/40"
            />
            <p className="mt-5 text-xs font-semibold tracking-wide text-blue-300">
              ONE-ON-ONE VOICE INTERVIEW
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">
              &ldquo;Hello {user.fullName}! Welcome to your mock interview. I&rsquo;m your AI interviewer today. Are you ready to begin?&rdquo;
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
              Target role: {session.targetRole} · Difficulty: {session.difficulty} · {totalQuestions} questions.
            </p>
            <button
              type="button"
              onClick={() => setHasGreeted(true)}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-blue-500 cursor-pointer"
            >
              Yes, Begin Question 1
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : latestEvaluation ? (
          /* Post-Answer Coaching Card inside Voice Studio */
          <div className="mt-6 rounded-2xl border border-white/15 bg-white p-6 text-slate-900 shadow-xl sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  {latestEvaluation.evaluationLabel}
                </p>
                <h2 className="mt-1 font-display text-xl font-bold text-slate-950">
                  Response Evaluated — Question {currentNum} of {totalQuestions}
                </h2>
              </div>
              <div className="rounded-xl bg-blue-50 px-4 py-2 text-right">
                <span className="font-mono text-2xl font-bold text-blue-700 tabular-nums">
                  {latestEvaluation.score} / 10
                </span>
              </div>
            </div>

            {latestEvaluation.fallbackNotice && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                {latestEvaluation.fallbackNotice}
              </div>
            )}

            <p className="mt-4 text-sm leading-relaxed text-slate-700">
              {latestEvaluation.summaryFeedback}
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Strengths
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {latestEvaluation.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-bold text-violet-700">Suggested Improvements</h3>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                  {latestEvaluation.suggestedImprovements.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {latestEvaluation.strongerAnswerExample && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <p className="text-xs font-bold text-blue-800">Stronger Answer Example</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {latestEvaluation.strongerAnswerExample}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleContinueNext}
                disabled={submitting}
                data-testid="voice-next-button"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
              >
                {submitting
                  ? 'Preparing Next Question...'
                  : currentNum >= totalQuestions
                    ? 'Generate Final Report'
                    : 'Next Question'}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          /* Active Question & Live Voice Studio */
          <div className="mt-4 space-y-4">
            {/* Spoken Prompt & Animated Waveform Card */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-semibold text-blue-300">
                  {currentQuestion.isFollowUp
                    ? 'Adaptive Follow-Up Question'
                    : `Question ${currentNum} · ${currentQuestion.category}`}
                </span>
                <button
                  type="button"
                  onClick={() => speakPrompt(currentQuestion.prompt)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100 hover:bg-white/20 cursor-pointer"
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Replay Question Audio
                </button>
              </div>

              <h1
                data-testid="voice-question-prompt"
                className="mt-2.5 font-display text-xl font-bold leading-snug text-white sm:text-2xl"
              >
                {currentQuestion.prompt}
              </h1>

              {/* Audio Waveform */}
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3.5">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-blue-200">
                    {submitting
                      ? 'Evaluating your answer...'
                      : isListening
                        ? 'Listening to your response...'
                        : isSpeaking
                          ? 'AI Interviewer is speaking...'
                          : 'Microphone standby — click Start Speaking or type below'}
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {countWords(fullText)} words
                  </span>
                </div>
                <canvas
                  ref={canvasRef}
                  width={760}
                  height={64}
                  aria-label="Real-time voice audio waveform"
                  className="h-14 w-full"
                />
              </div>

              {/* Microphone Primary Action */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  disabled={submitting}
                  className={`inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-bold shadow-lg transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="h-5 w-5" aria-hidden="true" />
                      Stop Microphone
                    </>
                  ) : (
                    <>
                      <Mic className="h-5 w-5" aria-hidden="true" />
                      Start Speaking
                    </>
                  )}
                </button>
              </div>

              {micError && (
                <div
                  role="alert"
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-xs text-amber-100"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
                    <span>{micError}</span>
                  </div>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-amber-300/40 bg-amber-400/20 px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-400/30 whitespace-nowrap shrink-0"
                  >
                    Open in New Tab
                  </a>
                </div>
              )}
            </div>

            {/* Live Transcript & Text Fallback Editor */}
            <div className="rounded-2xl border border-white/15 bg-white p-5 text-slate-900">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-transcript" className="text-sm font-bold text-slate-900">
                  Live Speech Transcription (Editable Text Fallback)
                </label>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {countWords(fullText)} words
                </span>
              </div>

              <textarea
                id="voice-transcript"
                rows={3}
                value={fullText}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setInterimTranscript('');
                  if (localError) setLocalError(null);
                }}
                placeholder="Your spoken words appear here live. If microphone access is unavailable, type your answer here directly..."
                className="mt-2.5 w-full rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />

              {(localError || serverError) && (
                <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                  {localError || serverError}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                  Speak naturally or refine the transcript before submitting for evaluation.
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  {submitting ? 'AI Evaluating Answer...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End Incomplete Interview Confirmation Modal */}
      {showEndConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl">
            <h2 id="end-modal-title" className="font-display text-lg font-bold text-slate-950">
              End this interview early?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {session.answers.length > 0
                ? `You have answered ${session.answers.length} of ${totalQuestions} questions. Ending now will generate a report from your completed answers.`
                : 'You have not submitted any answers yet. Ending now will return you to the dashboard.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndConfirm(false);
                  stopListening();
                  window.speechSynthesis?.cancel();
                  void onEndInterview(elapsedSeconds);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                Yes, End Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
