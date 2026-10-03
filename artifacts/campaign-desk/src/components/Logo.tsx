/** nano.club brand lockup. The mark is a lowercase "n" with a lime dot, the same dot that sits in the wordmark. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="nano.club">
      <rect width="64" height="64" rx="18" fill="#FF6A2B" />
      <path d="M19 44V27M19 34c0-5 3.5-8 8.5-8s8.5 3 8.5 8v10" stroke="#10222B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="46" cy="42" r="4.5" fill="#C6F432" />
    </svg>
  );
}

export function Wordmark() {
  return <span className="wordmark">nano<i>.</i>club</span>;
}

export function Logo({ size = 32 }: { size?: number }) {
  return <span className="logo"><LogoMark size={size} /><Wordmark /></span>;
}
