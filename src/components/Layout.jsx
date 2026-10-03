import { NavLink, Outlet, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLive } from '../context/LiveContext';
import { useTheme } from '../context/ThemeContext';
import { subscription, branches as branchesApi } from '../api/endpoints';
import { Icons } from './Icons';

const BASE_NAV_ITEMS = [
  { to: '/app', label: 'Dashboard', mobileLabel: 'Home', icon: Icons.dashboard, end: true },
  { to: '/app/inventory', label: 'Inventory', mobileLabel: 'Stock', icon: Icons.inventory },
];

const SERVICE_NAV_ITEM = { to: '/app/service', label: 'Service', mobileLabel: 'Service', icon: Icons.service };

const LIVE_STATUS_LABEL = {
  open: 'Live',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
  closed: 'Reconnecting…',
};

const LIVE_STATUS_TITLE = {
  open: 'Live — sales and stock changes appear instantly',
  connecting: 'Connecting to live updates…',
  reconnecting: 'Connection dropped — retrying now',
  offline: "Been offline a little while — you can keep selling, we'll catch up once it's back",
  closed: 'Reconnecting…',
};

const SALES_NAV_ITEM = { to: '/app/sales', label: 'Sales', mobileLabel: 'Sales', icon: Icons.sales };
const ATTENDANCE_NAV_ITEM = { to: '/app/attendance', label: 'Attendance', mobileLabel: 'Attend', icon: Icons.workers };

<<<<<<< HEAD
// Reports/Liabilities/Workers/Settings: full access within your own
// branch — an owner OR a branch manager (see core.permissions.is_owner
// on the backend, and MeView's is_owner_flag which mirrors it).
const OWNER_NAV_ITEMS = [
  { to: '/app/reports', label: 'Reports', mobileLabel: 'Reports', icon: Icons.reports },
  { to: '/app/liabilities', label: 'Liabilities', mobileLabel: 'Owe', icon: Icons.liabilities },
=======
// Workers/Settings: full access within your own branch only — an owner OR
// a branch manager (see core.permissions.is_owner on the backend, and
// MeView's is_owner_flag which mirrors it). Reports/Liabilities/Expenses
// are different: a CEO can also delegate any one of them to a specific
// trusted role via the Control Center (core.capabilities), so those use
// a capability check instead of the flat isOwner below, in getNavItems.
const OWNER_ONLY_NAV_ITEMS = [
>>>>>>> 0d80c3a (Add expense support)
  { to: '/app/workers', label: 'Workers', mobileLabel: 'Workers', icon: Icons.workers },
];
const SETTINGS_NAV_ITEM = { to: '/app/settings', label: 'Settings', mobileLabel: 'Settings', icon: Icons.settings };

// Billing is organization-wide (one subscription per Organization, shared
// by every branch — see subscriptions.models.Subscription) — a branch
// manager's "owner within my branch" authority deliberately doesn't
// extend to it, so this is CEO-only, not owner-only.
const CEO_NAV_ITEMS = [
  { to: '/app/billing', label: 'Billing', mobileLabel: 'Billing', icon: Icons.billing },
];

const STAFF_ROLE_LABEL = {
  owner: 'Owner', branch_manager: 'Branch manager', seller: 'Seller',
  reception: 'Receptionist', technician: 'Service technician',
  attendant: 'Shop attendant', other: 'Other',
};

export default function Layout() {
<<<<<<< HEAD
  const { user, logout, isOwner, isCeo, shopName, serviceEnabled } = useAuth();
=======
  const { user, logout, isOwner, isCeo, capabilities, shopName, serviceEnabled } = useAuth();
>>>>>>> 0d80c3a (Add expense support)
  const { status: liveStatus, versions } = useLive();
  const { theme, toggleTheme } = useTheme();
  // Service (device repair/servicing) only makes sense for businesses that
  // actually fix devices — a clothing or general retail shop never sees
  // the tab at all, rather than seeing an empty/irrelevant section. Driven
  // entirely by what the owner picked at signup (Organization.business_type
  // on the backend).
  const coreItems = serviceEnabled
    ? [...BASE_NAV_ITEMS, SERVICE_NAV_ITEM, SALES_NAV_ITEM, ATTENDANCE_NAV_ITEM]
    : [...BASE_NAV_ITEMS, SALES_NAV_ITEM, ATTENDANCE_NAV_ITEM];
  const items = [
    ...coreItems,
<<<<<<< HEAD
    ...(isOwner ? OWNER_NAV_ITEMS : []),
=======
    // isOwner already implies every one of these capabilities too (see
    // core.capabilities.has_capability's owner/branch-manager bypass) —
    // the capability check alone would be enough, but keeping `isOwner ||`
    // explicit here avoids a network round trip's worth of doubt about
    // ordering before `capabilities` has loaded for the common case.
    ...(isOwner || capabilities.view_financial_reports ? [{ to: '/app/reports', label: 'Reports', mobileLabel: 'Reports', icon: Icons.reports }] : []),
    ...(isOwner || capabilities.manage_liabilities ? [{ to: '/app/liabilities', label: 'Liabilities', mobileLabel: 'Owe', icon: Icons.liabilities }] : []),
    ...(isOwner || capabilities.manage_expenses ? [{ to: '/app/expenses', label: 'Expenses', mobileLabel: 'Expenses', icon: Icons.billing }] : []),
    ...(isOwner ? OWNER_ONLY_NAV_ITEMS : []),
>>>>>>> 0d80c3a (Add expense support)
    ...(isCeo ? CEO_NAV_ITEMS : []),
    ...(isOwner ? [SETTINGS_NAV_ITEM] : []),
  ];

  const [sub, setSub] = useState(null);
  useEffect(() => {
    subscription.status().then(({ data }) => setSub(data)).catch(() => {});
  }, [versions.subscription]);

  // Only relevant for a CEO running more than one branch — everyone else
  // has exactly one branch and the backend scopes every request to it
  // automatically, so there's nothing to switch. See api/client.js's
  // X-Branch-ID header and backend core.utils.get_shops_for_user.
  const [branchList, setBranchList] = useState(null);
  const [currentBranch, setCurrentBranch] = useState(localStorage.getItem('current_branch_id') || '');
  useEffect(() => {
    if (!isCeo) return;
    branchesApi.list().then(({ data }) => setBranchList(data.results || data)).catch(() => {});
  }, [isCeo]);

  function switchBranch(id) {
    if (id) localStorage.setItem('current_branch_id', id);
    else localStorage.removeItem('current_branch_id');
    setCurrentBranch(id);
    window.location.reload(); // simplest way to make every already-fetched page re-scope to the new branch
  }

  return (
    <div className="app-shell">
      <div className="sidebar">
        <div className="brand"><span className="dot" />{shopName}</div>
        {isCeo && branchList && branchList.length > 1 && (
          <select
            className="branch-switcher"
            value={currentBranch}
            onChange={(e) => switchBranch(e.target.value)}
            title="Switch which branch you're viewing"
          >
            <option value="">All branches</option>
            {branchList.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `navitem ${isActive ? 'active' : ''}`}
          >
            {item.icon}<span>{item.label}</span>
          </NavLink>
        ))}
        <div className="nav-footer mono">
          {user?.full_name || user?.username}
          <div style={{ opacity: 0.6, fontSize: 10.5, marginTop: 2, textTransform: 'uppercase', letterSpacing: '.5px' }}>
            {STAFF_ROLE_LABEL[user?.role] || (isOwner ? 'Owner' : 'Seller')}
          </div>
          <div className={`live-indicator ${liveStatus === 'open' ? 'live' : ''}`} title={LIVE_STATUS_TITLE[liveStatus] || LIVE_STATUS_TITLE.closed}>
            <span className="dot" />
            {LIVE_STATUS_LABEL[liveStatus] || LIVE_STATUS_LABEL.closed}
          </div>
          <button
            className="btn ghost small"
            style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}
            onClick={logout}
          >
            {Icons.logout} Log out
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? Icons.sun : Icons.moon}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </div>

      <main className="content">
        {sub && sub.effective_status === 'trial' && sub.current_period_end && (() => {
          const daysLeft = Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000 * 60 * 60 * 24));
          // Only nags in the final week of the trial — showing this from
          // day one would just be noise; a week out is when it's actually
          // actionable. Every login re-triggers this fetch, so the count
          // is always current, e.g. "ends in 5 days" the way it was asked
          // for, not a one-time dismissible toast that could go stale.
          if (daysLeft > 7) return null;
          return (
            <div className="banner warn" style={{ marginBottom: 18 }}>
              {daysLeft <= 0 ? 'Your free trial ends today.' : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`}
              {isCeo && <Link to="/app/billing" style={{ marginLeft: 'auto', fontWeight: 700 }}>Choose a plan →</Link>}
            </div>
          );
        })()}
        {sub && !sub.cloud_services_enabled && (
          <div className="banner warn" style={{ marginBottom: 18 }}>
            {sub.effective_status === 'expired'
              ? 'Subscription expired — cloud sync and the CEO app are paused. Selling on this desktop still works normally.'
              : "Subscription in its grace period — renew soon to keep cloud sync running."}
            {isCeo && <Link to="/app/billing" style={{ marginLeft: 'auto', fontWeight: 700 }}>Subscribe →</Link>}
          </div>
        )}
        <Outlet />
      </main>

      <button className="theme-toggle-fab" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? Icons.sun : Icons.moon}
      </button>

      <div className="bottomnav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {item.icon}<span>{item.mobileLabel}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
