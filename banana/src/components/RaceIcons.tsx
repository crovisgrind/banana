// src/components/RaceIcons.tsx

export const MedalIcon = ({ className = "w-8 h-8" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="50" cy="45" r="28" />
    <circle cx="50" cy="45" r="18" fill="currentColor" opacity="0.3" />
    <path d="M 50 15 L 42 25 L 50 28 L 58 25 Z" fill="currentColor" />
    <path d="M 35 65 Q 35 80 50 85 Q 65 80 65 65" strokeWidth="5" />
    <path d="M 42 68 L 58 68" strokeWidth="4" />
  </svg>
);

export const BananaIcon = ({ className = "w-8 h-8" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M 20 70 Q 35 20 70 30 Q 75 35 72 45" />
    <circle cx="72" cy="50" r="4" fill="currentColor" />
    <path d="M 15 75 Q 18 72 20 70" strokeWidth="5" />
  </svg>
);

export const ShoesIcon = ({ className = "w-8 h-8" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M 15 55 L 25 35 Q 28 25 35 22 L 50 20 Q 55 20 58 25 L 62 45 Q 62 55 58 60 Z" />
    <path d="M 62 45 L 70 30" />
    <path d="M 50 70 L 42 50 Q 40 42 42 32 L 50 30 Q 58 32 60 42 L 65 60 Q 65 68 60 72 Z" />
    <path d="M 42 50 L 38 45" />
    <line x1="20" y1="62" x2="58" y2="62" strokeWidth="5" />
  </svg>
);

export const CalendarIcon = ({ className = "w-8 h-8" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="18" y="25" width="64" height="60" rx="4" />
    <line x1="30" y1="15" x2="30" y2="35" strokeWidth="6" />
    <line x1="70" y1="15" x2="70" y2="35" strokeWidth="6" />
    <line x1="18" y1="45" x2="82" y2="45" strokeWidth="5" />
    <circle cx="30" cy="60" r="4" fill="currentColor" />
    <circle cx="50" cy="60" r="4" fill="currentColor" />
    <circle cx="70" cy="60" r="4" fill="currentColor" />
    <circle cx="30" cy="75" r="4" fill="currentColor" />
    <circle cx="50" cy="75" r="4" fill="currentColor" />
  </svg>
);

export const LocationIcon = ({ className = "w-8 h-8" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M 50 15 C 35 15 25 25 25 40 C 25 60 50 80 50 80 C 50 80 75 60 75 40 C 75 25 65 15 50 15 Z" />
    <circle cx="50" cy="40" r="8" fill="currentColor" opacity="0.4" />
  </svg>
);

export const ArrowIcon = ({ className = "w-6 h-6" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    strokeWidth="7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M 30 50 L 70 50" />
    <path d="M 55 35 L 70 50 L 55 65" />
  </svg>
);