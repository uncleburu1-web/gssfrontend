import { useEffect, useState } from 'react';
import { inventory, restaurant } from '../../api/endpoints';
import { useLive } from '../../context/LiveContext';
import { apiErrorMessage } from '../../utils/format';
import RestaurantStart from './RestaurantStart';
import { Card, METHOD, Row, SERVICE, lagosToday, naira } from './ReportsTab';

/**
 * A restaurant branch's dashboard (owners and managers): today's business day as the hub till uploads
 * it, the first set-up steps until they are done, and stock running low. Orders themselves are taken
 * on the hub till; a finished order shows here once the hub uploads it (seconds when online).
 */
export default function RestaurantDashboard() {
  const [day, setDay] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState('');
  const { versions } = useLive();
  useEffect(() => {
    let live = true;
    const today = lagosToday();
    Promise.all([restaurant.summary({ from: today, to: today }), inventory.list()])
      .then(([s, inv]) => {
        if (!live) return;
        setDay(s.data);
        setLowStock((inv.data.results || inv.data).filter((i) => i.is_low_stock));
        setError('');
      })
      .catch((err) => { if (live) setError(apiErrorMessage(err, 'Could not load today.')); });
    return () => { live = false; };
  }, [versions.sale, versions.inventoryitem, versions.stockbatch]);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">Today in the restaurant. Orders are taken on the hub till and appear here once it uploads them.</div>
        </div>
      </div>
      <RestaurantStart />
      {error && <div className="form-error">{error}</div>}
      {day && (
        <>
          <div className="stat-grid" data-restaurant-today>
            <div className="stat-card"><div className="stat-label">Takings today</div><div className="stat-value">{naira(day.takings)}</div></div>
            <div className="stat-card"><div className="stat-label">Orders</div><div className="stat-value">{day.orders}</div><div className="field-hint">{day.cancelled} cancelled</div></div>
            <div className="stat-card"><div className="stat-label">Covers</div><div className="stat-value">{day.covers}</div></div>
            <div className="stat-card"><div className="stat-label">Average bill</div><div className="stat-value">{naira(day.average_bill)}</div></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
            <Card title="By service">
              {Object.entries(day.by_service_type).map(([k, v]) => <Row key={k} left={`${SERVICE[k] || k} (${v.orders})`} right={naira(v.takings)} />)}
              {Object.keys(day.by_service_type).length === 0 && <div className="empty">No orders yet today.</div>}
            </Card>
            <Card title="Paid by">
              {Object.entries(day.by_payment_method).map(([k, v]) => <Row key={k} left={METHOD[k] || k} right={naira(v)} />)}
              {Object.keys(day.by_payment_method).length === 0 && <div className="empty">Nothing paid yet today.</div>}
            </Card>
            <Card title="Top items">
              {day.top_items.slice(0, 6).map((t) => <Row key={t.name} left={`${Number(t.quantity)} × ${t.name}`} right={naira(t.amount)} />)}
              {day.top_items.length === 0 && <div className="empty">Nothing sold yet today.</div>}
            </Card>
            <Card title="Kitchen">
              {Object.entries(day.kitchen_minutes).map(([k, v]) => <Row key={k} left={`${k}: order to ready`} right={`${v.average} min`} />)}
              <Row left={`Voided (${day.voids.lines} lines)`} right={naira(day.voids.waste_value)} dim />
            </Card>
          </div>
        </>
      )}
      <div className="section">
        <div className="section-head"><h3>Stock running low</h3></div>
        <div className="section-body">
          {lowStock.length === 0 ? <div className="empty">Nothing is running low.</div> : lowStock.slice(0, 10).map((i) => (
            <Row key={i.id} left={i.name} right={`${Number(i.quantity ?? 0)} left`} />
          ))}
        </div>
      </div>
    </>
  );
}
