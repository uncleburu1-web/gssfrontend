import { useEffect, useState } from 'react';
import { auditLog } from '../api/endpoints';
import { fmtDateTime, apiErrorMessage } from '../utils/format';

const today = () => new Date().toISOString().slice(0, 10);
const AREAS = [
  ['', 'Everything'], ['sale.', 'Sales'], ['stock.', 'Stock'], ['shift.', 'Shifts'], ['staff.', 'Staff'],
  ['permissions.', 'Permissions'], ['device.', 'Devices'], ['subscription.', 'Billing'],
];

/** Owners only: every sensitive action — who, when, what and why. Kept forever, never edited. */
export default function AuditLog() {
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [area, setArea] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    setError('');
    auditLog.list({ date_from: from || undefined, date_to: to || undefined, action: area || undefined })
      .then(({ data }) => setRows(data.results || data))
      .catch((err) => { setRows([]); setError(apiErrorMessage(err, 'Could not load the audit log.')); });
  }, [from, to, area]);

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Audit log</div>
          <div className="page-sub">Deleted sales, stock write-offs and counts, closed shifts, staff and permission changes</div>
        </div>
      </div>
      <div className="section">
        <div className="section-head" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            {AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="section-body">
          {error && <div className="form-error">{error}</div>}
          {rows === null ? <div className="empty">Loading…</div> : rows.length === 0 ? (
            <div className="empty">Nothing recorded for these dates.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>When</th><th>Who</th><th>What</th><th>Reason</th><th>Branch</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{fmtDateTime(r.at)}</td>
                      <td>{r.actor_name || 'System'}{r.source === 'till' ? ' (till)' : ''}</td>
                      <td>{r.summary || r.action}</td>
                      <td>{r.reason || '—'}</td>
                      <td>{r.shop_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
