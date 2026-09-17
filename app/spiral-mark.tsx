// The gap133 spiral-gauge mark as an inline React SVG component.
// Uses currentColor for the spiral strokes so it recolors per theme via the
// text color, and a CSS-variable fill (--accent) for the diamond.

export function SpiralMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size * (320 / 512)}
      viewBox="0 0 512 320"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <g stroke="currentColor" strokeWidth={26} strokeLinecap="square">
        {/* construction partition (hairlines) */}
        <g strokeWidth={4} opacity={0.3}>
          <line x1="316.5" y1="0" x2="316.5" y2="316.5" />
          <line x1="316.5" y1="195.5" x2="512" y2="195.5" />
          <line x1="437.5" y1="195.5" x2="437.5" y2="316.5" />
          <line x1="391" y1="242" x2="512" y2="242" />
        </g>
        {/* the spiral: quarter arcs */}
        <path d="M 0 0 A 316.5 316.5 0 0 0 316.5 316.5" />
        <path d="M 512 195.5 A 195.5 195.5 0 0 1 316.5 0" />
        <path d="M 437.5 316.5 A 121 121 0 0 1 316.5 195.5" transform="translate(121,0)" />
        <path d="M 437.5 242 A 46.5 46.5 0 0 1 391 195.5" />
        <path d="M 391 242 A 28.5 28.5 0 0 1 419.5 270.5" />
      </g>
      {/* acid diamond in the eye */}
      <rect x="404" y="242" width="30" height="30" fill="var(--accent)" transform="rotate(45 419 257)" />
    </svg>
  );
}
