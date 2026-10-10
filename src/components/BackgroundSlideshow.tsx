// ============================================================
// BackgroundSlideshow — kirish ekranlarining orqa foni uchun
// jadval mavzusidagi 4 ta SVG scena, 5 soniyada aylanib turadi,
// cross-fade transition bilan. Internet talab qilmaydi.
// ============================================================
import { useEffect, useState } from 'react'

type Scene = (color: string) => JSX.Element

/** 1-scena: Haftalik dars jadvali — rangli bloklar bilan */
const SceneTimetable: Scene = (c) => (
  <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={c} stopOpacity="0.15" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg1)" />
    {/* Jadval kartasi */}
    <g transform="translate(80, 60)">
      <rect width="640" height="480" rx="20" fill="#fff" opacity="0.85" />
      {/* Day header */}
      {['Du', 'Se', 'Ch', 'Pa', 'Ju'].map((d, i) => (
        <text key={d} x={120 + i * 100} y={40} textAnchor="middle" fontSize="18" fontWeight="700" fill="#64748b">
          {d}
        </text>
      ))}
      {/* Slot numbers + colored subject blocks */}
      {Array.from({ length: 6 }).map((_, r) => {
        const colors = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#eab308', '#ec4899']
        const subjects = [['Mat', 'Ona', 'Fiz', 'Ing', 'Jis'], ['Rus', 'Mat', 'Bio', 'Tar', 'Ona'], ['Ing', 'Fiz', 'Mat', 'Mus', 'Ona'], ['Mat', 'Rus', 'Jis', 'Fan', 'Ing'], ['Tar', 'Bio', 'Rus', 'Mat', 'Ona'], ['Ing', 'Jis', 'Fan', 'Mus', 'Mat']]
        return (
          <g key={r} transform={`translate(0, ${70 + r * 65})`}>
            <text x={50} y={32} textAnchor="middle" fontSize="20" fontWeight="800" fill="#94a3b8">
              {r + 1}
            </text>
            {Array.from({ length: 5 }).map((_, col) => {
              const color = colors[(r + col) % colors.length]
              return (
                <g key={col}>
                  <rect
                    x={80 + col * 100}
                    y={5}
                    width={85}
                    height={50}
                    rx={8}
                    fill={color}
                    opacity={0.22}
                  />
                  <rect x={80 + col * 100} y={5} width={4} height={50} fill={color} rx={2} />
                  <text
                    x={88 + col * 100}
                    y={25}
                    fontSize="13"
                    fontWeight="700"
                    fill={color}
                  >
                    {subjects[r][col]}
                  </text>
                  <text x={88 + col * 100} y={43} fontSize="10" fill={color} opacity={0.7}>
                    {['Aliyev', 'Soliyeva', 'Qodirov', 'Yoqubova', 'Yusupov'][col]}
                  </text>
                </g>
              )
            })}
          </g>
        )
      })}
    </g>
  </svg>
)

/** 2-scena: Taqvim + qo'ng'iroq */
const SceneCalendar: Scene = (c) => (
  <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff" stopOpacity="0" />
        <stop offset="100%" stopColor={c} stopOpacity="0.2" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg2)" />
    {/* Katta taqvim */}
    <g transform="translate(100, 80)">
      <rect width="400" height="440" rx="24" fill="#fff" opacity="0.9" />
      {/* Taqvim sarlavha */}
      <rect width="400" height="60" rx="24" fill={c} opacity={0.9} />
      <rect y={40} width="400" height="20" fill={c} opacity={0.9} />
      <text x={200} y={38} textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff">
        Sentyabr 2026
      </text>
      {/* Day letters */}
      {['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Y'].map((d, i) => (
        <text key={d} x={40 + i * 52} y={100} textAnchor="middle" fontSize="14" fontWeight="600" fill="#64748b">
          {d}
        </text>
      ))}
      {/* Dates */}
      {Array.from({ length: 35 }).map((_, i) => {
        const row = Math.floor(i / 7)
        const col = i % 7
        const date = i - 1
        const isHighlight = date === 15 || date === 22
        const isPast = date < 10
        if (date < 1 || date > 30) return null
        return (
          <g key={i}>
            {isHighlight && (
              <circle cx={40 + col * 52} cy={135 + row * 55} r={20} fill={c} opacity={0.3} />
            )}
            <text
              x={40 + col * 52}
              y={140 + row * 55}
              textAnchor="middle"
              fontSize={isHighlight ? '18' : '16'}
              fontWeight={isHighlight ? '800' : '500'}
              fill={isHighlight ? c : isPast ? '#cbd5e1' : '#334155'}
            >
              {date}
            </text>
          </g>
        )
      })}
    </g>
    {/* Qo'ng'iroq ikonkasi + "08:00" soat */}
    <g transform="translate(560, 150)">
      <circle cx="90" cy="90" r="95" fill="#fff" opacity={0.85} />
      <path
        d="M90 20 C70 20 55 35 55 55 L55 95 C55 105 45 115 45 115 L135 115 C135 115 125 105 125 95 L125 55 C125 35 110 20 90 20 Z"
        fill={c}
        opacity={0.8}
      />
      <circle cx="90" cy="135" r="14" fill={c} opacity={0.8} />
      <text x={90} y={190} textAnchor="middle" fontSize="24" fontWeight="800" fill={c}>
        08:00
      </text>
    </g>
  </svg>
)

/** 3-scena: O'qituvchilar + fanlar */
const SceneTeachers: Scene = (c) => (
  <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="bg3" cx="50%" cy="50%">
        <stop offset="0%" stopColor={c} stopOpacity="0.2" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg3)" />
    {/* O'qituvchi kartalari */}
    {[
      { x: 100, y: 100, name: 'Aliyev V.A.', subj: 'Matematika', color: '#3b82f6' },
      { x: 320, y: 80, name: 'Soliyeva D.', subj: 'Ona tili', color: '#f97316' },
      { x: 540, y: 120, name: 'Yusupov K.', subj: 'Fizika', color: '#a855f7' },
      { x: 150, y: 300, name: 'Qodirov B.', subj: 'Geometriya', color: '#22c55e' },
      { x: 400, y: 320, name: 'Yoqubova M.', subj: 'Ingliz tili', color: '#eab308' },
      { x: 600, y: 340, name: 'Rahimov J.', subj: 'Tarix', color: '#ec4899' },
    ].map((t, i) => (
      <g key={i} transform={`translate(${t.x}, ${t.y})`}>
        <rect width="180" height="140" rx="16" fill="#fff" opacity={0.88} />
        <circle cx="90" cy="50" r="30" fill={t.color} opacity={0.25} />
        <text x={90} y={58} textAnchor="middle" fontSize="26" fontWeight="800" fill={t.color}>
          {t.name.split(' ')[0][0]}{t.name.split(' ')[1][0]}
        </text>
        <text x={90} y={100} textAnchor="middle" fontSize="13" fontWeight="700" fill="#334155">
          {t.name}
        </text>
        <rect x={30} y={110} width={120} height={20} rx={10} fill={t.color} opacity={0.15} />
        <text x={90} y={125} textAnchor="middle" fontSize="11" fontWeight="600" fill={t.color}>
          {t.subj}
        </text>
      </g>
    ))}
  </svg>
)

/** 4-scena: Jadval generatsiya — statistika + diagramma */
const SceneStats: Scene = (c) => (
  <svg viewBox="0 0 800 600" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c} stopOpacity="0.15" />
        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bg4)" />
    {/* Dashboard kartasi */}
    <g transform="translate(100, 80)">
      <rect width="600" height="440" rx="24" fill="#fff" opacity={0.88} />
      {/* Statistika chiplari */}
      {[
        { label: 'Sinflar', value: '22', color: '#3b82f6' },
        { label: 'Fanlar', value: '18', color: '#f97316' },
        { label: 'O‘qituvchilar', value: '39', color: '#a855f7' },
        { label: 'Darslar', value: '240', color: '#ec4899' },
      ].map((s, i) => (
        <g key={i} transform={`translate(${30 + i * 140}, 30)`}>
          <rect width="120" height="90" rx="12" fill={s.color} opacity={0.1} />
          <rect y={0} width={120} height={3} fill={s.color} rx={1.5} />
          <text x={60} y={45} textAnchor="middle" fontSize="32" fontWeight="900" fill={s.color}>
            {s.value}
          </text>
          <text x={60} y={70} textAnchor="middle" fontSize="12" fontWeight="600" fill={s.color} opacity={0.8}>
            {s.label}
          </text>
        </g>
      ))}
      {/* Progress bars */}
      <text x={30} y={180} fontSize="16" fontWeight="700" fill="#334155">
        O&apos;qituvchi yuklamasi
      </text>
      {['Aliyev V.', 'Soliyeva D.', 'Qodirov B.', 'Yoqubova M.', 'Rahimov J.'].map((n, i) => {
        const widths = [430, 380, 340, 290, 240]
        return (
          <g key={i} transform={`translate(30, ${200 + i * 42})`}>
            <text x={0} y={14} fontSize="12" fill="#64748b">
              {n}
            </text>
            <rect x={120} y={0} width={420} height={20} rx={10} fill="#e2e8f0" />
            <rect x={120} y={0} width={widths[i]} height={20} rx={10} fill={c} opacity={0.75} />
            <text x={550} y={14} fontSize="11" fontWeight="700" fill={c}>
              {24 - i * 2}s
            </text>
          </g>
        )
      })}
    </g>
  </svg>
)

const SCENES: Scene[] = [SceneTimetable, SceneCalendar, SceneTeachers, SceneStats]
const COLORS = ['#4457d6', '#f97316', '#22c55e', '#a855f7']

interface Props {
  intervalMs?: number
  opacity?: number
  className?: string
}

export function BackgroundSlideshow({
  intervalMs = 5500,
  opacity = 0.55,
  className = '',
}: Props) {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx((v) => (v + 1) % SCENES.length), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
    >
      {SCENES.map((Scene, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-[1500ms] ease-in-out"
          style={{ opacity: i === idx ? 1 : 0 }}
        >
          {Scene(COLORS[i])}
        </div>
      ))}
    </div>
  )
}
