// The console's screens, grouped as the left rail shows them. Search and the rail both read this list.
export const NAV = [
  { grp: 'Console', items: [
    { to: '/', label: 'Home', short: 'Home', icon: 'home', end: true },
    { to: '/board', label: 'Outcome board', short: 'Board', icon: 'board' },
    { to: '/outcomes', label: 'My outcomes', short: 'Outcomes', icon: 'cards', badge: 'assigned' },
    { to: '/finance', label: 'Finance dashboard', short: 'Finance', icon: 'dollar' },
    { to: '/reports', label: 'Reports', short: 'Reports', icon: 'report' },
  ] },
  { grp: 'Collaborate', items: [
    { to: '/desks', label: 'Desks', short: 'Desks', icon: 'window' },
    { to: '/notifications', label: 'Notifications', short: 'Alerts', icon: 'bell', badge: 'unread' },
    { to: '/grids', label: 'Grid library', short: 'Grids', icon: 'grid' },
  ] },
  { grp: 'Operate', items: [
    { to: '/operations', label: 'Operations', short: 'Ops', icon: 'ops', badge: 'esc' },
  ] },
  { grp: 'Observe', items: [
    { to: '/monitoring', label: 'Monitoring', short: 'Monitor', icon: 'activity' },
    { to: '/usage', label: 'Usage & feedback', short: 'Usage', icon: 'trend' },
  ] },
  { grp: 'Access', items: [
    { to: '/access', label: 'My access', short: 'Access', icon: 'shield' },
  ] },
  { grp: 'Build', items: [
    { to: '/onboarding', label: 'Onboarding', short: 'Onboard', icon: 'build' },
    { to: '/configuration', label: 'Configuration', short: 'Config', icon: 'config' },
  ] },
  { grp: 'Testing', items: [
    { to: '/drive', label: 'Drive scenarios', short: 'Drive', icon: 'bolt' },
  ] },
  { grp: 'Guide', items: [
    { to: '/product', label: 'Product', short: 'Product', icon: 'book' },
    { to: '/architecture', label: 'Architecture', short: 'Arch', icon: 'compass' },
    { to: '/guide', label: 'Developer guide', short: 'Guide', icon: 'code' },
    { to: '/lifecycle', label: 'Event lifecycle', short: 'Lifecycle', icon: 'inbox' },
  ] },
];
