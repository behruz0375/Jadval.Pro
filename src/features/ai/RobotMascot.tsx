// ============================================================
// AI yordamchi — animatsiyali robot maskot komponenti.
// CSS-animatsiyalar bilan ishlaydi, tashqi rasm kerak emas.
// 6 ta holat: idle, listening, thinking, happy, confused, error
// ============================================================

import { useEffect, useState } from 'react'

export type RobotState = 'idle' | 'listening' | 'thinking' | 'happy' | 'confused' | 'error'

interface Props {
  state: RobotState
  size?: number
}

export function RobotMascot({ state, size = 120 }: Props) {
  const [blink, setBlink] = useState(false)

  // Ko'z yumish animatsiyasi — har 3-5 sekundda
  useEffect(() => {
    if (state === 'thinking') return
    const id = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 200)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(id)
  }, [state])

  const scale = size / 120

  return (
    <div
      className={`robot-mascot robot-${state}`}
      style={{ width: size, height: size + 20 }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 140"
        width={size}
        height={size + 20 * scale}
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        {/* ===== Antenna ===== */}
        <line
          x1="60" y1="18" x2="60" y2="6"
          stroke="var(--robot-accent, #6366f1)" strokeWidth="2.5"
          strokeLinecap="round"
          className="robot-antenna-stem"
        />
        <circle
          cx="60" cy="4" r="4"
          fill="var(--robot-accent, #6366f1)"
          className="robot-antenna-ball"
        />
        {/* Ikkinchi antenna (chap) */}
        <line
          x1="45" y1="22" x2="38" y2="10"
          stroke="var(--robot-accent, #6366f1)" strokeWidth="2"
          strokeLinecap="round"
          className="robot-antenna-stem"
        />
        <circle
          cx="37" cy="8" r="3"
          fill="var(--robot-accent, #6366f1)"
          className="robot-antenna-ball"
          style={{ animationDelay: '0.3s' }}
        />
        {/* Ikkinchi antenna (o'ng) */}
        <line
          x1="75" y1="22" x2="82" y2="10"
          stroke="var(--robot-accent, #6366f1)" strokeWidth="2"
          strokeLinecap="round"
          className="robot-antenna-stem"
        />
        <circle
          cx="83" cy="8" r="3"
          fill="var(--robot-accent, #6366f1)"
          className="robot-antenna-ball"
          style={{ animationDelay: '0.6s' }}
        />

        {/* ===== Bosh (head) ===== */}
        <rect
          x="28" y="18" rx="16" ry="16"
          width="64" height="52"
          fill="var(--robot-head, #e0e7ff)"
          stroke="var(--robot-accent, #6366f1)"
          strokeWidth="2.5"
          className="robot-head"
        />

        {/* ===== Ko'zlar ===== */}
        {state === 'thinking' ? (
          // O'ylayotgan — uch nuqta
          <>
            <circle cx="42" cy="42" r="3" fill="var(--robot-accent, #6366f1)" className="robot-dot dot-1" />
            <circle cx="55" cy="42" r="3" fill="var(--robot-accent, #6366f1)" className="robot-dot dot-2" />
            <circle cx="68" cy="42" r="3" fill="var(--robot-accent, #6366f1)" className="robot-dot dot-3" />
          </>
        ) : state === 'listening' ? (
          // Eshitayotgan — katta ko'zlar
          <>
            <ellipse cx="44" cy="40" rx={blink ? 5 : 5} ry={blink ? 1.5 : 7}
              fill="var(--robot-accent, #6366f1)" className="robot-eye-listen" />
            <ellipse cx="68" cy="40" rx={blink ? 5 : 5} ry={blink ? 1.5 : 7}
              fill="var(--robot-accent, #6366f1)" className="robot-eye-listen" />
            {/* Pupil shimmer */}
            <circle cx="44" cy="38" r="1.5" fill="white" opacity="0.7" />
            <circle cx="68" cy="38" r="1.5" fill="white" opacity="0.7" />
          </>
        ) : state === 'error' ? (
          // Xato — xafa ko'zlar (X shakli)
          <>
            <g className="robot-eye-error" transform="translate(44,40)">
              <line x1="-4" y1="-4" x2="4" y2="4" stroke="var(--robot-error, #ef4444)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="4" y1="-4" x2="-4" y2="4" stroke="var(--robot-error, #ef4444)" strokeWidth="2.5" strokeLinecap="round" />
            </g>
            <g className="robot-eye-error" transform="translate(68,40)">
              <line x1="-4" y1="-4" x2="4" y2="4" stroke="var(--robot-error, #ef4444)" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="4" y1="-4" x2="-4" y2="4" stroke="var(--robot-error, #ef4444)" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </>
        ) : state === 'confused' ? (
          // Tushunmadi — turli ko'zlar
          <>
            <circle cx="44" cy="40" r={blink ? 1 : 5}
              fill="var(--robot-accent, #6366f1)" />
            <ellipse cx="68" cy="40" rx={blink ? 4 : 4} ry={blink ? 1 : 6}
              fill="var(--robot-accent, #6366f1)" />
            {/* Savol belgisi */}
            <text x="76" y="32" fontSize="10" fontWeight="bold"
              fill="var(--robot-accent, #6366f1)" className="robot-question">?</text>
          </>
        ) : (
          // Idle / Happy — oddiy ko'zlar
          <>
            <ellipse cx="44" cy="40" rx={blink ? 5 : 5} ry={blink ? 1 : 5.5}
              fill="var(--robot-accent, #6366f1)"
              className="robot-eye" />
            <ellipse cx="68" cy="40" rx={blink ? 5 : 5} ry={blink ? 1 : 5.5}
              fill="var(--robot-accent, #6366f1)"
              className="robot-eye" />
            {/* Ko'z nurlanish */}
            {!blink && (
              <>
                <circle cx="42" cy="38" r="1.5" fill="white" opacity="0.6" />
                <circle cx="66" cy="38" r="1.5" fill="white" opacity="0.6" />
              </>
            )}
          </>
        )}

        {/* ===== Og'iz ===== */}
        {state === 'happy' ? (
          // Kulgi — keng tabassum
          <path d="M42,52 Q55,64 70,52"
            fill="none" stroke="var(--robot-accent, #6366f1)"
            strokeWidth="2.5" strokeLinecap="round"
            className="robot-smile" />
        ) : state === 'error' ? (
          // Xafa — teskari chiziq
          <path d="M44,56 Q55,48 68,56"
            fill="none" stroke="var(--robot-error, #ef4444)"
            strokeWidth="2.5" strokeLinecap="round" />
        ) : state === 'confused' ? (
          // Tushunmadi — to'lqinli og'iz
          <path d="M42,54 Q48,50 54,54 Q60,58 66,54"
            fill="none" stroke="var(--robot-accent, #6366f1)"
            strokeWidth="2" strokeLinecap="round" />
        ) : state === 'thinking' ? (
          // O'ylayotgan — to'g'ri chiziq
          <line x1="44" y1="54" x2="68" y2="54"
            stroke="var(--robot-accent, #6366f1)"
            strokeWidth="2" strokeLinecap="round" />
        ) : (
          // Oddiy — kichik tabassum
          <path d="M46,52 Q55,58 66,52"
            fill="none" stroke="var(--robot-accent, #6366f1)"
            strokeWidth="2" strokeLinecap="round" />
        )}

        {/* ===== Tana (body) ===== */}
        <rect
          x="32" y="74" rx="10" ry="10"
          width="56" height="40"
          fill="var(--robot-body, #c7d2fe)"
          stroke="var(--robot-accent, #6366f1)"
          strokeWidth="2"
          className="robot-body"
        />
        {/* Tana markazi — ekran/logo */}
        <rect
          x="44" y="82" rx="4" ry="4"
          width="32" height="18"
          fill="var(--robot-screen, #818cf8)"
          opacity="0.4"
          className="robot-screen"
        />
        {/* Ekrandagi belgi */}
        {state === 'happy' ? (
          <text x="54" y="95" fontSize="10" textAnchor="middle" fill="white" fontWeight="bold">:)</text>
        ) : state === 'error' ? (
          <text x="54" y="95" fontSize="10" textAnchor="middle" fill="white" fontWeight="bold">!</text>
        ) : state === 'thinking' ? (
          <g className="robot-gear">
            <circle cx="60" cy="91" r="5" fill="none" stroke="white" strokeWidth="1.5" />
            <circle cx="60" cy="91" r="2" fill="white" />
          </g>
        ) : (
          <text x="60" y="95" fontSize="9" textAnchor="middle" fill="white" fontWeight="bold" letterSpacing="1">JP</text>
        )}

        {/* ===== Qo'llar (arms) ===== */}
        {/* Chap qo'l */}
        <rect
          x="18" y="78" rx="5" ry="5"
          width="12" height="28"
          fill="var(--robot-body, #c7d2fe)"
          stroke="var(--robot-accent, #6366f1)"
          strokeWidth="1.5"
          className={`robot-arm robot-arm-left ${state === 'confused' ? 'robot-arm-scratch' : ''}`}
        />
        {/* O'ng qo'l */}
        <rect
          x="90" y="78" rx="5" ry="5"
          width="12" height="28"
          fill="var(--robot-body, #c7d2fe)"
          stroke="var(--robot-accent, #6366f1)"
          strokeWidth="1.5"
          className={`robot-arm robot-arm-right ${state === 'happy' ? 'robot-arm-wave' : ''}`}
        />

        {/* ===== Oyoqlar (feet) ===== */}
        <rect x="38" y="116" rx="4" ry="4" width="16" height="10"
          fill="var(--robot-body, #c7d2fe)" stroke="var(--robot-accent, #6366f1)" strokeWidth="1.5" />
        <rect x="66" y="116" rx="4" ry="4" width="16" height="10"
          fill="var(--robot-body, #c7d2fe)" stroke="var(--robot-accent, #6366f1)" strokeWidth="1.5" />

        {/* ===== Confused holat — bosh ustida savol belgisi ===== */}
        {state === 'confused' && (
          <text x="80" y="14" fontSize="16" fontWeight="bold"
            fill="var(--robot-accent, #6366f1)" className="robot-float-question"
            opacity="0.7">?</text>
        )}
      </svg>

      <style>{`
        .robot-mascot {
          --robot-accent: var(--accent, #6366f1);
          --robot-head: color-mix(in srgb, var(--accent, #6366f1) 12%, var(--surface, #f8fafc));
          --robot-body: color-mix(in srgb, var(--accent, #6366f1) 20%, var(--surface, #f8fafc));
          --robot-screen: var(--accent, #6366f1);
          --robot-error: var(--danger, #ef4444);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          user-select: none;
          flex-shrink: 0;
        }

        /* ===== IDLE — suzib yurish ===== */
        .robot-idle svg {
          animation: robotFloat 3s ease-in-out infinite;
        }
        @keyframes robotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* ===== LISTENING — bosh qiya, ko'zlar kattalashtirish ===== */
        .robot-listening svg {
          animation: robotListen 2s ease-in-out infinite;
        }
        @keyframes robotListen {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          30% { transform: rotate(5deg) translateY(-3px); }
          70% { transform: rotate(-3deg) translateY(-3px); }
        }
        .robot-eye-listen {
          animation: robotEyePulse 1.2s ease-in-out infinite;
        }
        @keyframes robotEyePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* ===== THINKING — tishli aylanish + nuqtalar ===== */
        .robot-thinking svg {
          animation: robotThink 2s ease-in-out infinite;
        }
        @keyframes robotThink {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .robot-dot {
          animation: robotDotBounce 1.4s ease-in-out infinite;
        }
        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.2s; }
        .dot-3 { animation-delay: 0.4s; }
        @keyframes robotDotBounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        .robot-gear {
          animation: robotGearSpin 2s linear infinite;
          transform-origin: 60px 91px;
        }
        @keyframes robotGearSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ===== HAPPY — sakrash + tabassum ===== */
        .robot-happy svg {
          animation: robotBounce 0.6s ease-in-out infinite;
        }
        @keyframes robotBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.02); }
        }
        .robot-smile {
          animation: robotSmileGrow 0.5s ease-out;
        }
        .robot-arm-wave {
          animation: robotWave 0.5s ease-in-out infinite;
          transform-origin: 96px 78px;
        }
        @keyframes robotWave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-20deg); }
        }

        /* ===== CONFUSED — bosh qashish ===== */
        .robot-confused svg {
          animation: robotConfused 3s ease-in-out infinite;
        }
        @keyframes robotConfused {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(4deg) translateY(-2px); }
          75% { transform: rotate(-4deg) translateY(-2px); }
        }
        .robot-arm-scratch {
          animation: robotScratch 1s ease-in-out infinite;
          transform-origin: 24px 78px;
        }
        @keyframes robotScratch {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          50% { transform: rotate(-30deg) translateY(-8px); }
        }
        .robot-question {
          animation: robotQuestionPop 1.5s ease-in-out infinite;
        }
        .robot-float-question {
          animation: robotFloatQ 2s ease-in-out infinite;
        }
        @keyframes robotQuestionPop {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes robotFloatQ {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 0.8; transform: translateY(-5px); }
        }

        /* ===== ERROR — silkinish ===== */
        .robot-error svg {
          animation: robotShake 0.5s ease-in-out 3;
        }
        @keyframes robotShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .robot-eye-error line {
          animation: robotErrorPulse 1s ease-in-out infinite;
        }
        @keyframes robotErrorPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ===== Antenna pulsatsiya (barcha holatlarda) ===== */
        .robot-antenna-ball {
          animation: robotAntennaPulse 2s ease-in-out infinite;
        }
        @keyframes robotAntennaPulse {
          0%, 100% { opacity: 1; r: inherit; }
          50% { opacity: 0.5; }
        }

        /* ===== Ekran yarqirash ===== */
        .robot-screen {
          animation: robotScreenGlow 3s ease-in-out infinite;
        }
        @keyframes robotScreenGlow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
