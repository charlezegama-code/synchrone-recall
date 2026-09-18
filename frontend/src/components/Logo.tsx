/** Inline SVG wordmark — no box, no background. "Synchrone" white bold, "Recall" indigo. */
export default function Logo({ compact = false, className }: { compact?: boolean; className?: string }) {
  if (compact) {
    // Icon-only mark for the collapsed rail: waveform into a lens.
    return (
      <svg viewBox="0 0 38 28" className={className} role="img" aria-label="Synchrone Recall" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M1 15 L6 15 L9 7 L13 23 L17 3 L20.5 15 L24 15"
          fill="none"
          stroke="#3F78C5"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="27.5" cy="14" r="6.5" fill="none" stroke="#ffffff" strokeWidth="2.2" />
        <line x1="32.1" y1="18.6" x2="36" y2="22.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 1.3 208 26.7" className={className} role="img" aria-label="Synchrone Recall" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0 16 L5 16 L8 8 L12 24 L16 4 L19.5 16 L23 16"
        fill="none"
        stroke="#3F78C5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26.5" cy="15" r="6.5" fill="none" stroke="#ffffff" strokeWidth="2" />
      <line x1="31.1" y1="19.6" x2="35" y2="23.5" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round" />
      <text x="46" y="22" fontFamily="Inter, sans-serif" fontSize="19" fontWeight="700" fill="#ffffff">
        Synchrone
      </text>
      <text x="152" y="22" fontFamily="Inter, sans-serif" fontSize="19" fontWeight="400" fill="#3F78C5">
        Recall
      </text>
    </svg>
  );
}
