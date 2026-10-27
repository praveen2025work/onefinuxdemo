import { Link } from 'react-router-dom';
import { PageHeader } from '../components/bits.jsx';
import Icon from '../components/Icon.jsx';
import { EMBED } from '../embed.js';

/** /instance with no id: an Instance viewer waiting for a linked view to pick a row. */
export default function InstanceWaiting() {
  return (
    <>
      <PageHeader keepTitle icon="eye" title="Waiting for a selection"
        summary={EMBED
          ? 'Pick a row in a view on the same link colour — the Outcome board or the Instance grid — and it opens here.'
          : 'Open an instance from the Outcome board, or put this viewer on a desk and link it to a board.'} />
      <div className="panel">
        <div className="panel-bd wait-card">
          <Icon name="link" size={22} />
          <span>Linked context type <span className="mono">ofx.instance</span> → <span className="mono">/instance/:id</span></span>
          {!EMBED && <Link className="btn ghost sm" to="/board"><Icon name="board" size={13} /> Outcome board</Link>}
        </div>
      </div>
    </>
  );
}
