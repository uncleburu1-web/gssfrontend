import { useEffect, useState } from 'react';
import { dashboard, inventory } from '../api/endpoints';
import { useLive } from '../context/LiveContext';
import { useAuth } from '../context/AuthContext';
import { money, fmtDateTime, apiErrorMessage } from '../utils/format';
import Amount from '../components/Amount';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { versions } = useLive();
  const { serviceEnabled, pharmacyEnabled } = useAuth();

  useEffect(() => {
    let mounted = true;
    async function load() {
      setError('');
      try {
        const [statsRes, activityRes, lowStockRes] = await Promise.all([
          dashboard.stats(),
          dashboard.activity(),
          inventory.list(),
        ]);
        if (!mounted) return;
        setStats(statsRes.data);
        setActivity(activityRes.data.results || activityRes.data);
        const items = lowStockRes.data.results || lowStockRes.data;
        setLowStock(items.filter((i) => i.is_low_stock));
      } catch (err) {
        if (mounted) setError(apiErrorMessage(err, 'Could not load the dashboard — check your connection and try again.'));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
    // Today's totals, recent activity, and low-stock all shift the moment
    // anyone (a seller here, the CEO, or the desktop) sells or restocks
    // something — this is the "₦50,000 -> ₦60,000 live" case directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.sale, versions.saleitem, versions.inventoryitem, versions.stockbatch]);

  if (loading) return <div className="empty">Loading dashboard…</div>;

  if (error) {
    return (
      <div className="empty" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <div className="form-error" style={{ margin: 0 }}>{error}</div>
        <button className="btn small" onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }
  if (!stats) return null;

  const dotColor = { inventory: 'var(--accent)', repair: 'var(--warn)', service: 'var(--good)', sale: 'var(--good)' };

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Today at a glance</div>
        </div>
      </div>

      <div className="hero-card" style={{ marginBottom: 16 }}>
        <div className="stat-label">
          {serviceEnabled ? 'Total collected today — product sales + service payments' : "Today's total collected"}
        </div>
        <div className="hero-value mono">{money(stats.total_collected_today)}</div>
        {serviceEnabled && (
          <div className="hero-breakdown">
            <span><span className="dot" style={{ background: 'var(--accent)' }} />Product sales {money(stats.today_revenue)}</span>
            <span><span className="dot" style={{ background: 'var(--good)' }} />Service revenue {money(stats.service_revenue_today)}</span>
          </div>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Today's product sales</div>
          <Amount className="stat-value mono" value={stats.today_revenue} />
        </div>
        {serviceEnabled && (
          <>
            <div className="stat-card">
              <div className="stat-label">Service revenue (today)</div>
              <Amount className="stat-value mono good" value={stats.service_revenue_today} />
            </div>
            <div className="stat-card">
              <div className="stat-label">Active service tickets</div>
              <div className="stat-value mono">{stats.active_service_tickets}</div>
            </div>
          </>
        )}
        <div className="stat-card">
          <div className="stat-label">Low stock items</div>
          <div className={`stat-value mono ${stats.low_stock_count ? 'warn' : 'good'}`}>{stats.low_stock_count}</div>
        </div>
        {pharmacyEnabled && (
          <div className="stat-card">
            <div className="stat-label">Expiring within 30 days</div>
            <div className={`stat-value mono ${stats.expiring_soon_count ? 'warn' : 'good'}`}>{stats.expiring_soon_count}</div>
          </div>
        )}
      </div>

      <div className="section">
        <div className="section-head"><h3>Low stock alerts</h3></div>
        <div className="section-body">
          {lowStock.length === 0 ? (
            <div className="empty">Nothing running low — stock looks healthy.</div>
          ) : (
            lowStock.map((i) => (
              <div className="low-item" key={i.id}>
                <span>{i.name} <span style={{ color: 'var(--text-dim)' }}>({i.category})</span></span>
                <span className="num" style={{ color: 'var(--warn)' }}>{i.quantity} left</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-head"><h3>Recent activity</h3></div>
        <div className="section-body">
          {activity.length === 0 ? (
            <div className="empty">No activity yet. Add stock, open a ticket, or record a sale to get started.</div>
          ) : (
            activity.map((a, idx) => (
              <div className="activity-item" key={idx}>
                <span className="activity-dot" style={{ background: dotColor[a.type] }} />
                <span style={{ flex: 1 }}>{a.text}</span>
                <span className="activity-time mono">{fmtDateTime(a.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
