export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 1.3 208 26.7"
      className={className}
      role="img"
      aria-label="Synchrone Recall"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* waveform trailing into the magnifying glass lens */}
      <path
        d="M0 16 L5 16 L8 8 L12 24 L16 4 L19.5 16 L23 16"
        fill="none"
        stroke="#3F78C5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26.5" cy="15" r="6.5" fill="none" stroke="#3F78C5" strokeWidth="2" />
      <line x1="31.1" y1="19.6" x2="35" y2="23.5" stroke="#3F78C5" strokeWidth="2.25" strokeLinecap="round" />

      <text x="46" y="22" fontFamily="Inter, sans-serif" fontSize="19" fontWeight="700" fill="#1B2A4A">
        Synchrone
      </text>
      <text x="152" y="22" fontFamily="Inter, sans-serif" fontSize="19" fontWeight="400" fill="#3F78C5">
        Recall
      </text>
    </svg>
  );
}
