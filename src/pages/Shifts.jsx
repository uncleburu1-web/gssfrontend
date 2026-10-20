import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { shifts as shiftsApi } from '../api/endpoints';
import { money, fmtDateTime, apiErrorMessage } from '../utils/format';

// The tills' cashier shifts and Z-reports (stage 3). Uploaded by the desktop tills; read-only here.
// An owner, branch manager, CEO or a role granted "See every seller's sales" sees everyone's;
// anyone else sees only their own (the backend enforces this, the page just says which).

function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function Variance({ value }) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  const n = Number(value);
  const cls = n === 0 ? 'good' : n < 0 ? 'expired' : 'warn';
  const label = n === 0 ? 'Balanced' : n < 0 ? `Short ${money(-n)}` : `Over ${money(n)}`;
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function Shifts() {
  const { isOwner, capabilities } = useAuth();
  const { versions } = useLive();
  const seesEveryone = isOwner || capabilities.view_all_sales;
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    setError('');
    shiftsApi.list({ date_from: dateFrom, date_to: dateTo })
      .then(({ data }) => setList(data.results || data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load shifts.')));
  }, [dateFrom, dateTo, versions.shift, versions.cashmovement]);

  function show(id) {
    shiftsApi.get(id).then(({ data }) => setOpen(data)).catch((err) => setError(apiErrorMessage(err, 'Could not open that shift.')));
  }

  const closed = (list || []).filter((s) => s.status === 'closed');
  const totalVariance = closed.reduce((sum, s) => sum + Number(s.variance || 0), 0);

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Shifts</div>
          <div className="page-sub">
            {seesEveryone ? 'Every cashier’s shift and cash count, from every till' : 'Your shifts and cash counts'}
          </div>
        </div>
      </div>

      <div className="section">
        <div className="section-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          <label>From<input type="date" value={dateFrom} max={dateTo} onChange={(e) => setDateFrom(e.target.value)} /></label>
          <label>To<input type="date" value={dateTo} min={dateFrom} onChange={(e) => setDateTo(e.target.value)} /></label>
          {closed.length > 0 && (
            <div style={{ marginLeft: 'auto' }}>
              {closed.length} closed shift{closed.length === 1 ? '' : 's'} · cash <Variance value={totalVariance} />
            </div>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="section">
        <div className="section-body">
          {!list ? (
            <div className="empty">Loading…</div>
          ) : list.length === 0 ? (
            <div className="empty">No shifts in this period. Shifts are opened and closed on the desktop till.</div>
          ) : (
            <table className="table">
              <thead>
                <tr><th>Opened</th>{seesEveryone && <th>Cashier</th>}<th>Till</th><th>Float</th><th>Expected</th><th>Counted</th><th>Cash</th><th>Z</th></tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} onClick={() => show(s.id)} style={{ cursor: 'pointer' }}>
                    <td>{fmtDateTime(s.opened_at)}{s.status === 'open' && <span className="badge active" style={{ marginLeft: 6 }}>Open</span>}</td>
                    {seesEveryone && <td>{s.cashier}</td>}
                    <td>{s.device_name || '—'}</td>
                    <td>{money(s.opening_float)}</td>
                    <td>{s.expected_cash === null ? '—' : money(s.expected_cash)}</td>
                    <td>{s.counted_cash === null ? '—' : money(s.counted_cash)}</td>
                    <td><Variance value={s.variance} /></td>
                    <td className="mono">{s.z_number ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {open && <ShiftDetail shift={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ShiftDetail({ shift, onClose }) {
  const r = shift.report;
  const byMethod = r?.payments?.by_method || {};
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h3>{shift.status === 'closed' ? `Z-report #${shift.z_number}` : 'Open shift'} · {shift.cashier}</h3>
        <div>
          <p className="muted">
            {fmtDateTime(shift.opened_at)} → {shift.closed_at ? fmtDateTime(shift.closed_at) : 'still open'}{shift.device_name ? ` · ${shift.device_name}` : ''}
          </p>
          {r ? (
            <table className="table">
              <tbody>
                <tr><td>Sales</td><td>{r.sales?.count ?? 0} · {money(r.sales?.gross ?? 0)}</td></tr>
                <tr><td>Cash taken</td><td>{money(byMethod.cash || 0)}</td></tr>
                <tr><td>Transfer</td><td>{money(byMethod.transfer || 0)}</td></tr>
                <tr><td>Card (POS)</td><td>{money(byMethod.pos || 0)}</td></tr>
                {byMethod.mobile ? <tr><td>Mobile money</td><td>{money(byMethod.mobile)}</td></tr> : null}
                <tr><td>Opening float</td><td>{money(r.cash?.opening_float ?? shift.opening_float)}</td></tr>
                <tr><td>Paid in / out</td><td>{money(r.cash?.paid_in || 0)} / {money(r.cash?.paid_out || 0)}</td></tr>
                <tr><td>Expected cash</td><td>{money(r.cash?.expected ?? 0)}</td></tr>
                <tr><td>Counted cash</td><td>{money(r.cash?.counted ?? 0)}</td></tr>
                <tr><td>Difference</td><td><Variance value={r.cash?.variance} /></td></tr>
                {r.voided?.count > 0 && <tr><td>Voided sales</td><td>{r.voided.count} · {money(r.voided.paid)}</td></tr>}
              </tbody>
            </table>
          ) : (
            <p>The Z-report appears here when the cashier closes the shift on the till.</p>
          )}
          <h4 style={{ marginTop: 16 }}>Cash moved in or out</h4>
          {shift.cash_movements.length === 0 ? (
            <p className="muted">None.</p>
          ) : (
            <table className="table">
              <tbody>
                {shift.cash_movements.map((m) => (
                  <tr key={m.id}>
                    <td>{fmtDateTime(m.occurred_at)}</td>
                    <td>{m.kind === 'paid_in' ? 'In' : 'Out'}</td>
                    <td>{money(m.amount)}</td>
                    <td>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {shift.notes && <p><strong>Notes:</strong> {shift.notes}</p>}
        </div>
        <div className="modal-actions"><button className="btn ghost" onClick={onClose}>Close</button></div>
      </div>
    </div>
  );
}
