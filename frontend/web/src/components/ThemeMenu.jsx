import Menu from './Menu.jsx';
import Icon from './Icon.jsx';
import { THEMES } from '../theme.js';
import { useApp } from '../store.jsx';

const SWATCH = {
  dark: ['#090d1c', '#818cf8'],
  light: ['#f5f6fb', '#6366f1'],
  steps: ['#f8fafc', '#2563eb'],
  'steps-dark': ['#0b111e', '#3b83f6'],
};

/** STEPS ThemeSwitcher: one icon button, a menu of themes grouped by family. */
export default function ThemeMenu() {
  const { themeId, setTheme } = useApp();
  const current = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const families = [...new Set(THEMES.map((t) => t.family))];
  return (
    <Menu width={232} trigger={(open, toggle) => (
      <button type="button" className={'tb-icon' + (open ? ' on' : '')} onClick={toggle}
        title={`Theme: ${current.label}`} aria-label={`Theme: ${current.label}`} aria-expanded={open}>
        <Icon name={current.icon} size={17} />
      </button>
    )}>
      {(close) => (
        <>
          {families.map((fam) => (
            <div key={fam} className="menu-sec">
              <div className="menu-lbl">{fam}</div>
              {THEMES.filter((t) => t.family === fam).map((t) => (
                <button key={t.id} type="button" role="menuitemradio" aria-checked={t.id === themeId}
                  className={'menu-item' + (t.id === themeId ? ' on' : '')}
                  onClick={() => { setTheme(t.id); close(); }}>
                  <span className="theme-sw" style={{ background: SWATCH[t.id][0] }}>
                    <i style={{ background: SWATCH[t.id][1] }} />
                  </span>
                  <span className="menu-txt">{t.label}</span>
                  {t.id === themeId && <Icon name="check" size={14} />}
                </button>
              ))}
            </div>
          ))}
        </>
      )}
    </Menu>
  );
}
