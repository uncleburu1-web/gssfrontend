import { useEffect, useState } from 'react';
import { devices, restaurant } from '../../api/endpoints';
import { apiErrorMessage, fmtDateTime } from '../../utils/format';

/**
 * Which till runs the restaurant. Only that till (the hub) takes orders, so two tills can never each
 * hold a different set of open tables; kitchen screens connect to it over the shop's Wi-Fi.
 */
export default function HubTab() {
  const [list, setList] = useState(null);
  const [hub, setHub] = useState(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const load = () => Promise.all([devices.list(), restaurant.settings()])
    .then(([d, s]) => { setList((d.data.results || d.data).filter((x) => x.device_type === 'desktop')); setHub(s.data.hub_device); })
    .catch((err) => setError(apiErrorMessage(err, 'Could not load the tills.')));
  useEffect(() => { load(); }, []);

  async function choose(d) {
    const replacing = hub && hub !== d.id;
    if (replacing && !confirm(`Make "${d.name || 'this till'}" the hub? Finish or cancel every open order on the current hub first: open orders stay on the till that holds them.`)) return;
    setError(''); setNote('');
    try {
      await restaurant.setHub(d.id);
      setNote(`${d.name || 'This till'} is now the restaurant hub. It picks this up within seconds when online.`);
      load();
    } catch (err) { setError(apiErrorMessage(err, 'Could not change the hub.')); }
  }

  return (
    <div className="section">
      <div className="section-head"><h3>Hub till</h3></div>
      <div className="section-body">
        <p className="field-hint" style={{ fontSize: 13, marginTop: 4 }}>
          One till in this branch runs the restaurant: it takes the orders, prints kitchen tickets and serves the kitchen screens, with or without internet.
          Keep it on a UPS. Other tills in the branch keep selling as a supermarket till.
        </p>
        {error && <div className="form-error">{error}</div>}
        {note && <div className="field-hint" style={{ color: 'var(--good)', marginBottom: 8 }}>{note}</div>}
        {list === null ? <div className="empty">Loading…</div> : list.length === 0 ? (
          <div className="empty">No till has signed in to this branch yet. Install the Benchline till app on the PC and sign in, then choose it here.</div>
        ) : (
          <table>
            <thead><tr><th>Till</th><th>Version</th><th>Last seen</th><th></th></tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td>{d.name || 'Unnamed till'} {hub === d.id && <span className="badge good" style={{ marginLeft: 6 }}>Hub</span>}</td>
                  <td className="num">{d.app_version || '—'}</td>
                  <td>{d.last_seen_at ? fmtDateTime(d.last_seen_at) : 'never'}</td>
                  <td className="row-actions">{hub !== d.id && <button className="btn small" onClick={() => choose(d)}>Make this the hub</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
