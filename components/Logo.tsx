type LogoProps = {
  size?: number;
  "aria-hidden"?: boolean;
};

export default function Logo({ size = 32, "aria-hidden": ariaHidden }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden={ariaHidden}
    >
      <rect x="4" y="4" width="56" height="56" rx="14" fill="#0f172a" stroke="#334155" strokeWidth="1" />
      <g opacity="0.45">
        <line x1="18" y1="28" x2="18" y2="54" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="15" y="34" width="6" height="12" rx="1" fill="#22c55e" />
        <line x1="32" y1="24" x2="32" y2="52" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="29" y="30" width="6" height="14" rx="1" fill="#ef4444" />
        <line x1="46" y1="18" x2="46" y2="46" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="43" y="24" width="6" height="12" rx="1" fill="#22c55e" />
      </g>
      <path
        d="M 44 20 A 16 16 0 1 0 44 44"
        fill="none"
        stroke="#f8fafc"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <polyline
        points="30,38 36,32 40,35 48,26"
        fill="none"
        stroke="#22c55e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="26" r="2.5" fill="#22c55e" />
    </svg>
  );
}
