import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

export const GUIDE_TABS = [
  { to: '/product', label: 'Product', icon: 'book' },
  { to: '/architecture', label: 'Architecture', icon: 'compass' },
  { to: '/guide', label: 'Developer guide', icon: 'code' },
  { to: '/lifecycle', label: 'Event lifecycle', icon: 'inbox' },
];

export default function GuideNav() {
  return (
    <nav className="seg guide-seg" aria-label="Product guides">
      {GUIDE_TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'on' : '')}>
          <Icon name={t.icon} size={14} /> {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
