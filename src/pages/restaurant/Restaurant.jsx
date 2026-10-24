import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { restaurant, branches } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import ConfigList from './ConfigList';
import MenuTab from './MenuTab';
import TaxesTab from './TaxesTab';
import HubTab from './HubTab';
import { useLists } from './useLists';

/**
 * A restaurant branch's own pages (owner's request, 23 Oct 2026: the restaurant is the main thing for
 * a restaurant branch, so Menu, Tables, Kitchen, Taxes & charges and Hub till sit in the sidebar
 * themselves, and its takings are in the normal Reports page). Everything here is saved in the cloud
 * and reaches the branch's hub till on its next pull (within seconds when it is online).
 */
export function RestaurantPage({ title, sub, children }) {
  const { restaurantEnabled, shopName, allBranchesView, viewingBranchId, businessTypeLabel } = useAuth();
  // The branch being set up: a CEO may be viewing another branch than their own (shopName).
  const [branchName, setBranchName] = useState(viewingBranchId ? '' : shopName);
  useEffect(() => {
    if (!viewingBranchId) { setBranchName(shopName); return; }
    branches.get(viewingBranchId).then(({ data }) => setBranchName(data.name)).catch(() => setBranchName('this branch'));
  }, [viewingBranchId, shopName]);

  if (allBranchesView) {
    return (
      <div className="section" style={{ maxWidth: 640 }}>
        <div className="section-body" style={{ padding: 22 }}>
          <h3 style={{ marginTop: 0 }}>Choose a branch</h3>
          <p style={{ color: 'var(--text-dim)' }}>Each restaurant branch has its own menu, tables and kitchen. Pick the branch in the switcher at the top of the menu.</p>
        </div>
      </div>
    );
  }
  if (!restaurantEnabled) {
    return (
      <div className="section" style={{ maxWidth: 640 }}>
        <div className="section-body" style={{ padding: 22 }}>
          <h3 style={{ marginTop: 0 }}>{branchName || 'This branch'} is not a restaurant</h3>
          <p style={{ color: 'var(--text-dim)' }}>It is set up as {businessTypeLabel ? businessTypeLabel.split(' (')[0].toLowerCase() : 'a shop'}. To run it as a restaurant, change its kind of shop in <Link to="/app/settings">Settings → Branches</Link>.</p>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div className="topbar">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-sub">{branchName ? `${branchName}: ` : ''}{sub}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function MenuPage() {
  return <RestaurantPage title="Menu" sub="what you sell, where it is made, and the choices on each item. The hub till picks up every change by itself."><MenuTab /></RestaurantPage>;
}

export function TablesPage() {
  return <RestaurantPage title="Tables" sub="the floor the waiters see on the hub till."><TablesTab /></RestaurantPage>;
}

export function KitchenPage() {
  return <RestaurantPage title="Kitchen" sub="where food and drink are made, and how tickets reach each station."><KitchenTab /></RestaurantPage>;
}

export function TaxesPage() {
  return <RestaurantPage title="Taxes & charges" sub="service charge, taxes and how orders are numbered."><TaxesTab /></RestaurantPage>;
}

export function HubPage() {
  return <RestaurantPage title="Hub till" sub="the till that runs the restaurant."><HubTab /></RestaurantPage>;
}

/** Old links (/app/restaurant?tab=...) open the matching page. */
const OLD_TABS = { menu: '/app/menu', tables: '/app/tables', kitchen: '/app/kitchen', taxes: '/app/taxes', hub: '/app/hub-till', reports: '/app/reports' };
export default function RestaurantRedirect() {
  const [params] = useSearchParams();
  return <Navigate to={OLD_TABS[params.get('tab')] || '/app/menu'} replace />;
}

const nameOf = (rows, id) => (rows || []).find((r) => r.id === id)?.name || (rows || []).find((r) => r.id === id)?.label || '—';

function TablesTab() {
  const [{ areas, tables }, reload, error] = useLists(['areas', 'tables']);
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <ConfigList title="Areas" hint="Parts of the floor, e.g. Hall, Terrace, VIP." rows={areas} api={restaurant.areas} onChanged={reload} addLabel="+ Add area"
        fields={[{ key: 'name', label: 'Name', required: true, placeholder: 'e.g. Hall' }, { key: 'sort', label: 'Order on the floor', type: 'number', min: 0 }]}
        defaults={{ sort: 0 }} columns={[{ label: 'Area', key: 'name' }]} empty="Add an area first, then its tables." />
      <ConfigList title="Tables" hint="One open order per table at a time; the hub shows them on its floor." rows={tables} api={restaurant.tables} onChanged={reload} addLabel="+ Add table"
        fields={[
          { key: 'area', label: 'Area', type: 'select', required: true, options: (areas || []).filter((a) => a.is_active).map((a) => ({ value: a.id, label: a.name })) },
          { key: 'label', label: 'Table', required: true, placeholder: 'e.g. T1' },
          { key: 'seats', label: 'Seats', type: 'number', min: 1, required: true },
          { key: 'sort', label: 'Order in the area', type: 'number', min: 0 },
        ]}
        defaults={{ seats: 4, sort: 0 }}
        columns={[{ label: 'Table', key: 'label' }, { label: 'Area', render: (r) => nameOf(areas, r.area) }, { label: 'Seats', key: 'seats', num: true }]} />
    </div>
  );
}

function KitchenTab() {
  const [{ stations }, reload, error] = useLists(['stations']);
  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <ConfigList title="Stations" rows={stations} api={restaurant.stations} onChanged={reload} addLabel="+ Add station"
        hint="Where food and drink are made. A station can print tickets, show them on a kitchen screen, or both. Which printer it uses is chosen on the hub till."
        fields={[
          { key: 'name', label: 'Name', required: true, placeholder: 'e.g. Kitchen, Bar, Grill' },
          { key: 'prints', label: 'Prints tickets on a kitchen printer', type: 'checkbox' },
          { key: 'shows_on_screen', label: 'Shows tickets on a kitchen screen', type: 'checkbox', hint: 'Then cooks mark food ready on the screen. Without a screen, waiters serve straight from the pass.' },
          { key: 'sort', label: 'Order', type: 'number', min: 0 },
        ]}
        defaults={{ prints: true, shows_on_screen: false, sort: 0 }}
        columns={[{ label: 'Station', key: 'name' }, { label: 'Tickets', render: (r) => [r.prints && 'Printer', r.shows_on_screen && 'Screen'].filter(Boolean).join(' + ') || 'Neither' }]}
        empty="Add at least one station so orders reach the kitchen." />
      <div className="section">
        <div className="section-head"><h3>Kitchen printers and screens</h3></div>
        <div className="section-body" style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-dim)', paddingTop: 12 }}>
          Printers and kitchen screens connect to the <b style={{ color: 'var(--text)' }}>hub till</b> on the shop&apos;s Wi-Fi, so the kitchen keeps working without internet.
          On the hub till, open <b style={{ color: 'var(--text)' }}>Restaurant → Set-up</b>: choose each station&apos;s printer, and pair a kitchen screen (a tablet or TV browser) with the 6-digit code it shows.
        </div>
      </div>
    </div>
  );
}
