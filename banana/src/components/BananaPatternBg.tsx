// src/components/BananaPatternBg.tsx
'use client';

export default function BananaPatternBg() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none -z-10"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1000 1000"
    >
      <defs>
        {/* Padrão de banana minimalista */}
        <pattern
          id="bananaPattern"
          x="0"
          y="0"
          width="200"
          height="200"
          patternUnits="userSpaceOnUse"
        >
          {/* Banana 1 */}
          <g transform="translate(50, 50)">
            <path
              d="M 10 5 Q 20 0 30 5 Q 35 8 32 15"
              stroke="#FFE55C"
              strokeWidth="3"
              fill="none"
              opacity="0.15"
              strokeLinecap="round"
            />
          </g>

          {/* Banana 2 - rotacionada */}
          <g transform="translate(130, 80) rotate(45)">
            <path
              d="M 10 5 Q 20 0 30 5 Q 35 8 32 15"
              stroke="#F6C700"
              strokeWidth="3"
              fill="none"
              opacity="0.12"
              strokeLinecap="round"
            />
          </g>

          {/* Banana 3 */}
          <g transform="translate(80, 130) rotate(-30)">
            <path
              d="M 10 5 Q 20 0 30 5 Q 35 8 32 15"
              stroke="#FFE55C"
              strokeWidth="3"
              fill="none"
              opacity="0.1"
              strokeLinecap="round"
            />
          </g>

          {/* Círculo decorativo */}
          <circle
            cx="100"
            cy="100"
            r="8"
            fill="#FF7A29"
            opacity="0.08"
          />
        </pattern>

        {/* Gradiente sutil */}
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="50%" stopColor="#FFFEF5" stopOpacity="1" />
          <stop offset="100%" stopColor="#FFFAF0" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Background gradiente */}
      <rect width="1000" height="1000" fill="url(#bgGradient)" />

      {/* Padrão de bananas */}
      <rect width="1000" height="1000" fill="url(#bananaPattern)" />
    </svg>
  );
}