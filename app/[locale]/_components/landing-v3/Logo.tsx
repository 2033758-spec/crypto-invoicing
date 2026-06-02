/**
 * Logo — v3 brand glyph from .design-system/project/assets/logo.svg.
 * Inlined as SVG so we can color the strokes with currentColor variants
 * and keep the file in a single React tree (no extra HTTP request).
 *
 * Renders the corner-node + outer ring + C-document + checkmark in the
 * jade accent + white check pattern.
 */
export default function Logo({
  className = "w-7 h-7",
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={size ? undefined : className}
      width={size}
      height={size}
      aria-hidden
    >
      {/* outer ring (jade @ 20% opacity) */}
      <path
        d="M25,25 L75,25 L75,75 L25,75 Z"
        fill="none"
        stroke="#69dab6"
        strokeWidth="1.5"
        strokeOpacity="0.2"
      />
      {/* C-document */}
      <path
        d="M70,35 L40,35 L40,65 L70,65"
        fill="none"
        stroke="#69dab6"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* checkmark */}
      <path
        d="M45,50 L55,60 L80,30"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* corner nodes */}
      <rect x="23.5" y="23.5" width="3" height="3" fill="#69dab6" />
      <rect x="73.5" y="23.5" width="3" height="3" fill="#69dab6" />
      <rect x="73.5" y="73.5" width="3" height="3" fill="#69dab6" />
      <rect x="23.5" y="73.5" width="3" height="3" fill="#69dab6" />
    </svg>
  );
}
