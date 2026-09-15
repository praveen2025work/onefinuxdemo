// Distinct 24×24 marks so the rail, titles and tiles read at a glance. Stroke 1.85, currentColor.
const P = {
  home: (
    <>
      <path d="M3.5 11 12 3.5 20.5 11" />
      <path d="M6 10.2V20h4.2v-5.2h3.6V20H18V10.2" />
      <path d="M10.2 20h3.6" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="2.2" />
      <path d="M3 8.4h18" />
      <path d="M9.2 8.4v12.1M14.8 8.4v12.1" />
      <path d="M5.4 11.2h2.2M5.4 14.2h2.2M11.1 11.2h2.2M16.4 11.2h2.2M16.4 15.4h2.2" />
    </>
  ),
  cards: (
    <>
      <rect x="5" y="7.5" width="16" height="12.5" rx="1.8" />
      <path d="M8 7.5V6.2A1.7 1.7 0 0 1 9.7 4.5h9.6A1.7 1.7 0 0 1 21 6.2V16" />
    </>
  ),
  ops: (
    <>
      <path d="M8 14.5v1.8a4 4 0 0 0 8 0v-1.8" />
      <path d="M7 11.2a5 5 0 0 1 10 0" />
      <path d="M5.2 11.6c-.9.4-1.7 1.4-1.7 2.6 0 1 .6 1.8 1.5 2.1M18.8 11.6c.9.4 1.7 1.4 1.7 2.6 0 1-.6 1.8-1.5 2.1" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.2" height="7.2" rx="1.4" />
      <rect x="13.8" y="3" width="7.2" height="7.2" rx="1.4" />
      <rect x="3" y="13.8" width="7.2" height="7.2" rx="1.4" />
      <rect x="13.8" y="13.8" width="7.2" height="7.2" rx="1.4" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16M4 12h16M4 17h12" />
    </>
  ),
  config: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="8.5" cy="7" r="2.1" fill="currentColor" />
      <circle cx="15.5" cy="12" r="2.1" fill="currentColor" />
      <circle cx="10" cy="17" r="2.1" fill="currentColor" />
    </>
  ),
  build: (
    <>
      <path d="M14.2 4.8 19.2 9.8" />
      <path d="M3.5 20.5 5 16.2 16.2 5l2.8 2.8L7.8 19l-4.3 1.5Z" />
      <path d="M16.8 3.6 20.4 7.2" />
    </>
  ),
  bell: (
    <>
      <path d="M6.2 9.2a5.8 5.8 0 1 1 11.6 0c0 4.4 1.8 5.6 1.8 5.6H4.4s1.8-1.2 1.8-5.6" />
      <path d="M9.4 19.4a2.6 2.6 0 0 0 5.2 0" />
    </>
  ),
  chevron: <path d="m14.8 5.5-6.3 6.5 6.3 6.5" />,
  down: <path d="m6 9 6 6 6-6" />,
  calendar: (
    <>
      <rect x="3.2" y="4.8" width="17.6" height="16" rx="2.2" />
      <path d="M3.2 9.4h17.6M8 3.4v3.2M16 3.4v3.2" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 16.6h.01M12 16.6h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M20.2 12a8.2 8.2 0 1 1-2.6-6.1L20.5 8.4" />
      <path d="M20.5 3.6v4.8h-4.8" />
    </>
  ),
  check: <path d="m4.2 12.2 5.2 5.2L19.8 6.6" />,
  bolt: <path d="M13.2 2.4 4.4 13.6h6.6l-1 8 8.8-11.2h-6.6l1-8Z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 10.8v5.4M12 7.6h.02" />
    </>
  ),
  activity: <path d="M2.6 12.5h3.8l2.4 7.2 5-16.4 2.6 9.2H21.4" />,
  report: (
    <>
      <path d="M6.2 2.8h7.6l4 4V20.6a1.2 1.2 0 0 1-1.2 1.2H6.2A1.2 1.2 0 0 1 5 20.6V4a1.2 1.2 0 0 1 1.2-1.2Z" />
      <path d="M13.8 2.8v4.2h4M8.4 12.4h7.2M8.4 15.8h7.2M8.4 9h3.4" />
    </>
  ),
  share: (
    <>
      <circle cx="6.2" cy="12" r="2.5" />
      <circle cx="17.8" cy="5.8" r="2.5" />
      <circle cx="17.8" cy="18.2" r="2.5" />
      <path d="M8.4 10.9 15.5 6.9M8.4 13.1l7.1 4" />
    </>
  ),
  book: (
    <>
      <path d="M5 19.2A2.4 2.4 0 0 1 7.4 17H20" />
      <path d="M7.4 3H20v18H7.4A2.4 2.4 0 0 1 5 18.6V5.4A2.4 2.4 0 0 1 7.4 3Z" />
      <path d="M9 7.4h7.2M9 11h5.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3.2 2.1" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.6 12.4 5.4 4.8h13.2l1.8 7.6v6.4a1.6 1.6 0 0 1-1.6 1.6H5.2A1.6 1.6 0 0 1 3.6 18.8v-6.4Z" />
      <path d="M3.6 12.4h5l1.4 2.6h4l1.4-2.6h5" />
    </>
  ),
  spark: (
    <>
      <path d="M12 2.6v4.2M12 17.2v4.2M4.8 12H2.6M21.4 12h-2.2M6.4 6.4l-1.6-1.6M19.2 19.2l-1.6-1.6M6.4 17.6l-1.6 1.6M19.2 4.8l-1.6 1.6" />
      <circle cx="12" cy="12" r="3.4" />
    </>
  ),
  eye: (
    <>
      <path d="M2.6 12s3.4-6.4 9.4-6.4S21.4 12 21.4 12s-3.4 6.4-9.4 6.4S2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.4 21.2 20H2.8L12 3.4Z" />
      <path d="M12 10v4.2M12 16.8h.02" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8 19.6 6v6.2c0 4.6-3.2 7.6-7.6 8.8-4.4-1.2-7.6-4.2-7.6-8.8V6L12 2.8Z" />
      <path d="M9.2 12.2 11.2 14.2 15.2 9.6" />
    </>
  ),
  layers: (
    <>
      <path d="M3.6 8.4 12 4.2l8.4 4.2L12 12.6 3.6 8.4Z" />
      <path d="M3.6 12.4 12 16.6l8.4-4.2" />
      <path d="M3.6 16.2 12 20.4l8.4-4.2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.2" r="2.8" />
      <path d="M3.6 18.8c.4-3.2 2.6-4.8 5.4-4.8s5 1.6 5.4 4.8" />
      <circle cx="16.6" cy="8.8" r="2.2" />
      <path d="M15.2 14.2c1.8.2 3.4 1.4 3.8 4.6" />
    </>
  ),
  code: (
    <>
      <path d="m8.2 8.2-4.4 3.8 4.4 3.8M15.8 8.2l4.4 3.8-4.4 3.8" />
      <path d="m13.2 6-2.4 12" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m10.2 13.8 1.2-4.6 4.6-1.2-1.2 4.6-4.6 1.2Z" />
    </>
  ),
  headset: (
    <>
      <path d="M5.4 13v3.4A1.8 1.8 0 0 0 7.2 18.2h.8" />
      <path d="M18.6 13v3.4a1.8 1.8 0 0 1-1.8 1.8h-.8" />
      <path d="M5.4 13a6.6 6.6 0 1 1 13.2 0" />
      <rect x="3.6" y="11.4" width="3.4" height="5.2" rx="1.2" />
      <rect x="17" y="11.4" width="3.4" height="5.2" rx="1.2" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
    </>
  ),
  play: <path d="M8 5.6v12.8L19 12 8 5.6Z" fill="currentColor" stroke="none" />,
  open: (
    <>
      <path d="M14 5h5.4V10.4" />
      <path d="M13.2 10.8 19.4 4.6" />
      <path d="M18 13.4v6A1.6 1.6 0 0 1 16.4 21H5.6A1.6 1.6 0 0 1 4 19.4V8.6A1.6 1.6 0 0 1 5.6 7H11" />
    </>
  ),
  history: (
    <>
      <path d="M4.2 12a7.8 7.8 0 1 0 2-5.2" />
      <path d="M4.2 4.8v4.6h4.6" />
      <path d="M12 8.4V12l2.8 1.8" />
    </>
  ),
  warning: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.6v5M12 15.8h.02" />
    </>
  ),
  tower: (
    <>
      <path d="M8.4 21V9.6L12 4.4l3.6 5.2V21" />
      <path d="M6.2 21h11.6" />
      <path d="M10.4 13.2h3.2M10.4 16.6h3.2" />
    </>
  ),
  sla: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 6.6v5.6l3.4 2" />
      <path d="M16.8 5.2 19 3.4M19 5.8h-2.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.1" />
      <path d="M5.2 19.4c.5-3.6 3-5.4 6.8-5.4s6.3 1.8 6.8 5.4" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.6 6.2a3.4 3.4 0 0 1 4.6 4.6l-8.2 8.2a2 2 0 0 1-2.8 0l-1.2-1.2a2 2 0 0 1 0-2.8l8.2-8.2Z" />
      <path d="M15.8 10.2 13.8 8.2" />
    </>
  ),
};

export const ROUTE_ICON = {
  '/': 'home',
  '/product': 'book',
  '/architecture': 'compass',
  '/guide': 'code',
  '/board': 'board',
  '/outcomes': 'cards',
  '/reports': 'report',
  '/operations': 'ops',
  '/monitoring': 'activity',
  '/onboarding': 'build',
  '/configuration': 'config',
  '/drive': 'bolt',
};

export function iconForRoute(to = '/') {
  const path = String(to).split('?')[0];
  return ROUTE_ICON[path] || 'grid';
}

export default function Icon({ name, size = 18, fill = 'none', className = '' }) {
  return (
    <svg className={'icn ' + className} width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
