import { Component, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

/**
 * Around the routed screens. A screen whose code fails to download (the dev server restarted, a deploy replaced
 * the chunks, the network dropped) shows why and offers a reload instead of a blank page; the next navigation
 * clears it.
 */
class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (prev.path !== this.props.path && this.state.error) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = /dynamically imported module|Importing a module script failed|Loading chunk/i.test(String(error.message));
    return (
      <div className="banner fail" role="alert">
        <Icon name="alert" size={16} />
        <span>{chunk ? 'This screen did not download. The console may have been updated or restarted.' : `This screen failed: ${error.message}`}</span>
        <button type="button" className="btn ghost sm" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }
}

export default function RouteBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary path={pathname}>{children}</Boundary>;
}

/** The fallback while a screen downloads; after a while it says so and offers a reload rather than spinning on. */
export function ScreenLoading({ slowAfterMs = 8000 }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), slowAfterMs);
    return () => clearTimeout(t);
  }, [slowAfterMs]);
  if (!slow) return <div className="spin">Loading…</div>;
  return (
    <div className="banner warn" role="status">
      <Icon name="clock" size={15} />
      <span>Still loading this screen. The console or the hub may be busy.</span>
      <button type="button" className="btn ghost sm" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}
