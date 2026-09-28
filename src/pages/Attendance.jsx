import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendance as attendanceApi } from '../api/endpoints';
import { fmtDate, apiErrorMessage } from '../utils/format';

const STATUS_LABEL = {
  present: 'Present', late: 'Late', absent: 'Absent', half_day: 'Half day', on_leave: 'On leave',
};
const STATUS_OPTIONS = Object.entries(STATUS_LABEL);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function Attendance() {
  // 'mark_attendance' and 'view_attendance' come from core.capabilities on
  // the backend — always true for an owner/branch manager/CEO, otherwise
  // whatever the Control Center (Settings) has configured for this role.
  // Someone with neither still gets a page here, just a narrower one: their
  // own attendance history only (see AttendanceHistory + the backend's own
  // self-view fallback in AttendanceRecordViewSet.get_queryset).
  const { capabilities } = useAuth();
  const canMark = !!capabilities.mark_attendance;
  const canViewAll = !!capabilities.view_attendance;

  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">Attendance</div>
          <div className="page-sub">
            {canMark ? 'Mark who\u2019s in today, and look back at past days.' : 'Your attendance history.'}
          </div>
        </div>
      </div>

      {canMark && <TodayRoster />}
      <AttendanceHistory canViewAll={canViewAll} />
    </div>
  );
}

function TodayRoster() {
  const [date, setDate] = useState(todayIso());
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');

  function load() {
    attendanceApi.today(date)
      .then(({ data }) => setRows(data.rows))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load the roster.')));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [date]);

  async function mark(row, status) {
    setSavingId(row.worker_id);
    setError('');
    try {
      await attendanceApi.mark({ worker: row.worker_id, date, status });
      load();
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save that.'));
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="section">
      <div className="section-head">
        <h3>Roster</h3>
        <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="section-body">
        {error && <div className="form-error">{error}</div>}
        {!rows ? (
          <div className="empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="empty">No active workers at this branch yet.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Worker</th><th>Role</th><th>Status</th><th>Marked by</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.worker_id}>
                  <td>{row.worker_name}</td>
                  <td className="mono">{row.worker_role}</td>
                  <td>
                    <select
                      value={row.status || ''}
                      disabled={savingId === row.worker_id}
                      onChange={(e) => mark(row, e.target.value)}
                    >
                      <option value="" disabled>Not marked</option>
                      {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="field-hint">{row.marked_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AttendanceHistory({ canViewAll }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  function load() {
    attendanceApi.list()
      .then(({ data }) => setRows(data.results || data))
      .catch((err) => setError(apiErrorMessage(err, 'Could not load attendance history.')));
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="section">
      <div className="section-head"><h3>{canViewAll ? 'History' : 'Your history'}</h3></div>
      <div className="section-body">
        {error && <div className="form-error">{error}</div>}
        {!rows ? (
          <div className="empty">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="empty">
            {canViewAll ? 'No attendance recorded yet.' : 'Nothing recorded for you yet — ask reception or the owner.'}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                {canViewAll && <th>Worker</th>}
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.date)}</td>
                  {canViewAll && <td>{r.worker_name}</td>}
                  <td><span className={`pill ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                  <td className="field-hint">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
