import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Code2,
  Compass,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { AuthUser } from '../lib/types';

interface LandingPageProps {
  user: AuthUser | null;
  onNavigate: (path: string) => void;
}

const SAMPLE_PROMPTS = [
  {
    category: 'HR Behavioral',
    question: 'Tell me about a time you solved a difficult problem under a tight deadline.',
    transcript:
      '"During our final capstone sprint, our API latency spiked 3x. I profiled the SQL queries, added composite indexes, and cut response time by 68% before launch."',
  },
  {
    category: 'Python Technical',
    question: 'When would you choose a tuple over a list in production Python code?',
    transcript:
      '"I use tuples for fixed, immutable records or dictionary keys to prevent accidental mutation and reduce memory overhead."',
  },
];

export function LandingPage({ user, onNavigate }: LandingPageProps) {
  const [sampleSpeaking, setSampleSpeaking] = useState(false);
  const [sampleIdx, setSampleIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Subtle animated waveform on the hero preview card
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bars = 36;
      const gap = w / bars;
      const barWidth = Math.max(3, gap * 0.52);

      for (let i = 0; i < bars; i++) {
        const norm = i / bars;
        const envelope = Math.sin(norm * Math.PI);
        const speed = sampleSpeaking ? 0.14 : 0.045;
        const amp = sampleSpeaking ? 0.85 : 0.35;
        const wave =
          Math.abs(Math.sin(phase * (1 + (i % 3) * 0.15) + i * 0.42)) * amp + 0.12;
        const barH = Math.max(6, wave * envelope * (h - 10));
        const x = i * gap + (gap - barWidth) / 2;
        const y = (h - barH) / 2;

        ctx.fillStyle = sampleSpeaking ? '#60A5FA' : '#818CF8';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 3);
        ctx.fill();
      }

      phase += sampleSpeaking ? 0.11 : 0.04;
      rafId = window.requestAnimationFrame(draw);
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, [sampleSpeaking]);

  const toggleSampleVoice = () => {
    if (sampleSpeaking) {
      window.speechSynthesis?.cancel();
      setSampleSpeaking(false);
      return;
    }

    const nextIdx = (sampleIdx + 1) % SAMPLE_PROMPTS.length;
    setSampleIdx(nextIdx);
    setSampleSpeaking(true);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(SAMPLE_PROMPTS[nextIdx].question);
      utter.rate = 1.02;
      utter.onend = () => setSampleSpeaking(false);
      utter.onerror = () => setSampleSpeaking(false);
      window.speechSynthesis.speak(utter);
    } else {
      setTimeout(() => setSampleSpeaking(false), 3200);
    }
  };

  const activeSample = SAMPLE_PROMPTS[sampleIdx];

  return (
    <div className="bg-slate-50 text-slate-900">
      {/* Deep Navy Commercial Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#08102D] via-[#0F1E4E] to-[#1B1F5E] text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
          <div className="lg:col-span-6">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              Your Next Interview Starts Here.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-200 sm:text-lg">
              Practice with AI. Speak with confidence. Get hired with preparation.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate(user ? '/dashboard' : '/register')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition-all hover:bg-blue-500 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Start Practising
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-500/50 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 whitespace-nowrap shrink-0"
              >
                Explore Features
              </a>
            </div>
          </div>

          {/* Right Side: Interactive AI Interviewer Interface */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-white/15 bg-slate-950/65 p-6 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src="/src/assets/images/ai_interviewer_avatar_1794739756686.jpg"
                    alt="Elena Vance AI interviewer avatar"
                    referrerPolicy="no-referrer"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-blue-400/50"
                  />
                  <div>
                    <p className="font-display text-sm font-bold text-white">Elena Vance</p>
                    <p className="text-xs text-blue-200">AI Interview Coach · {activeSample.category}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSampleVoice}
                  aria-label={sampleSpeaking ? 'Stop sample voice prompt' : 'Play sample voice prompt'}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    sampleSpeaking
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-blue-100 hover:bg-white/20'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {sampleSpeaking ? 'Speaking...' : 'Hear Prompt'}
                </button>
              </div>

              <div className="mt-5">
                <p className="text-xs font-medium text-blue-300">Interviewer Question</p>
                <p className="mt-1.5 font-display text-lg font-semibold leading-snug text-white">
                  &ldquo;{activeSample.question}&rdquo;
                </p>
              </div>

              {/* Live Animated Audio Waveform */}
              <div className="mt-5 rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={56}
                  aria-label="Live AI interviewer audio waveform"
                  className="h-14 w-full"
                />
              </div>

              {/* Candidate Transcript Snippet + Mic Indicator */}
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5">
                <button
                  type="button"
                  onClick={toggleSampleVoice}
                  aria-label="Toggle sample voice session"
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-transform hover:scale-105 cursor-pointer"
                >
                  {sampleSpeaking ? (
                    <Mic className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <MicOff className="h-4 w-4 opacity-90" aria-hidden="true" />
                  )}
                </button>
                <div className="text-xs leading-relaxed text-slate-200">
                  <span className="font-semibold text-blue-300">Live Voice Transcript</span>
                  <p className="mt-0.5">{activeSample.transcript}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-xl">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Everything You Need to Sound Ready
          </h2>
          <p className="mt-2.5 text-base text-slate-600">
            Realistic voice and text practice paired with structured AI coaching.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Mic,
              title: 'AI Voice Interviews',
              desc: 'Hold natural spoken mock interviews with live audio waveforms and speech transcription.',
            },
            {
              icon: Briefcase,
              title: 'HR Interview Practice',
              desc: 'Refine behavioral stories, strengths, and role motivation with clear structure.',
            },
            {
              icon: Code2,
              title: 'Technical Interview Practice',
              desc: 'Practise Python, SQL, algorithms, and system concepts at your target difficulty.',
            },
            {
              icon: Sparkles,
              title: 'Instant Answer Feedback',
              desc: 'Receive a 10-point score, strengths, missing points, and stronger sample answers.',
            },
            {
              icon: BarChart3,
              title: 'Performance Analytics',
              desc: 'Track score progression, practice hours, and weak areas across saved attempts.',
            },
            {
              icon: Compass,
              title: 'Personalized Learning',
              desc: 'Generate custom role-based interviews for Data Analyst, Full Stack, or ML roles.',
            },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            How It Works
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                num: 'Step 1',
                title: 'Choose Your Interview.',
                desc: 'Pick HR, Technical, or a Custom job role with Voice or Text mode.',
              },
              {
                num: 'Step 2',
                title: 'Talk to Your AI Interviewer.',
                desc: 'Listen to spoken prompts and respond naturally into your microphone.',
              },
              {
                num: 'Step 3',
                title: 'Receive Intelligent Feedback.',
                desc: 'Review Gemini AI scores, missing points, and stronger answer examples.',
              },
              {
                num: 'Step 4',
                title: 'Improve Your Performance.',
                desc: 'Inspect analytics charts and target weak areas on your next session.',
              },
            ].map((step) => (
              <div key={step.num} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="font-mono text-xs font-semibold text-blue-600">{step.num}</p>
                <h3 className="mt-2 font-display text-base font-bold text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Practice Like It's the Real Interview */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid grid-cols-1 items-center gap-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Practice Like It&rsquo;s the Real Interview.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Speak directly with an AI interviewer that listens, transcribes your response live, adapts follow-up questions, and scores clarity and technical accuracy.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate(user ? '/configure' : '/register')}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                Try Voice Interview
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              {!user && (
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <img
                src="/src/assets/images/voice_studio_desk_1794739756674.jpg"
                alt="Voice interview desk setup with condenser microphone and laptop"
                referrerPolicy="no-referrer"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Final Call-to-Action */}
      <section className="bg-gradient-to-r from-[#0B1437] via-[#13266B] to-[#3B1E7A] py-16 text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Ready to become interview-ready?
          </h2>
          <p className="mt-3 max-w-xl text-base text-slate-200">
            Create your free account in seconds and start your first guided Voice or Text mock interview.
          </p>
          <button
            type="button"
            onClick={() => onNavigate(user ? '/configure' : '/register')}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#0B1437] shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer"
          >
            Start Your First Interview
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      {/* Clean Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <p className="font-display font-semibold text-slate-900">
            PrepBot<span className="text-blue-600">.</span>
          </p>
          <div className="flex items-center gap-6">
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/login');
              }}
              className="hover:text-slate-900"
            >
              Sign In
            </a>
            <a
              href="/register"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/register');
              }}
              className="hover:text-slate-900"
            >
              Create Account
            </a>
            <a
              href="/dashboard"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/dashboard');
              }}
              className="hover:text-slate-900"
            >
              Dashboard
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
