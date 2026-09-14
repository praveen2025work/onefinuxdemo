// Small inline SVG set so the console has crisp icons instead of emoji. 1.6px strokes, currentColor.
const P = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5" />,
  board: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 9v11" /></>,
  cards: <><rect x="3" y="4" width="18" height="7" rx="1.5" /><rect x="3" y="13" width="18" height="7" rx="1.5" /></>,
  ops: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  config: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="var(--canvas)" /><circle cx="15" cy="12" r="2" fill="var(--canvas)" /><circle cx="8" cy="18" r="2" fill="var(--canvas)" /></>,
  build: <path d="m14 6 4 4M3 21l1-4L15 6l3 3L7 20l-4 1ZM17 3l4 4-2 2-4-4 2-2Z" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M9.5 20a2.5 2.5 0 0 0 5 0" />,
  chevron: <path d="m15 6-6 6 6 6" />,
  down: <path d="m6 9 6 6 6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></>,
  refresh: <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />,
  play: <path d="m7 4 13 8-13 8V4Z" />,
  check: <path d="m4 12 5 5L20 6" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8h.01" /></>,
  activity: <path d="M3 12h4l2.5 7 5-16L17 12h4" />,
  report: <><path d="M6 2.5h8l4 4V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" /><path d="M14 2.5V6.5h4M8.5 13h7M8.5 16.5h7M8.5 9.5h3" /></>,
  share: <><circle cx="6" cy="12" r="2.6" /><circle cx="18" cy="5.5" r="2.6" /><circle cx="18" cy="18.5" r="2.6" /><path d="M8.3 10.8 15.7 6.7M8.3 13.2l7.4 4.1" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><path d="M8 7h8M8 11h6" /></>,
};

export default function Icon({ name, size = 18, fill = 'none', className = '' }) {
  return (
    <svg className={'icn ' + className} width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {P[name] || null}
    </svg>
  );
}

export function BrandMark({ size = 34 }) {
  // Three layers stitched into one — the group unit / kit / instance stack.
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id="ofx-g" x1="0" y1="0" x2="40" y2="40">
          <stop offset="0" stopColor="#00aeef" /><stop offset="1" stopColor="#00395d" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="10" fill="url(#ofx-g)" />
      <g stroke="#04121f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.92">
        <path d="M11 14.5 20 10l9 4.5-9 4.5-9-4.5Z" />
        <path d="M11 20l9 4.5 9-4.5" />
        <path d="M11 25.5 20 30l9-4.5" />
      </g>
    </svg>
  );
}
