import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { reports } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { money } from '../utils/format';
import { Icons } from '../components/Icons';
import Amount from '../components/Amount';

const REPORT_TABS = [
=======
import { reports, analytics } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { money, apiErrorMessage } from '../utils/format';
import { Icons } from '../components/Icons';
import Amount from '../components/Amount';

// 'overview'/'expense-analytics'/'liability-analytics' are the newer
// Business Intelligence layer (reports/analytics.py on the backend) —
// multi-period, comparison-aware. Everything else below them is the
// older single-day/single-month report set; both stay on one page since
// an owner thinks of this as one "Reports" section, but they're driven
// by two different period pickers (see RANGE_TABS) because the BI layer
// supports week/year/custom ranges the older reports never needed.
const RANGE_TABS = new Set(['overview', 'expense-analytics', 'liability-analytics']);
const PERIOD_OPTIONS = [
  ['today', 'Today'], ['yesterday', 'Yesterday'], ['this_week', 'This week'], ['last_week', 'Last week'],
  ['this_month', 'This month'], ['last_month', 'Last month'], ['this_year', 'This year'], ['custom', 'Custom range'],
];

const REPORT_TABS = [
  { id: 'overview', label: 'Executive Overview' },
>>>>>>> 0d80c3a (Add expense support)
  { id: 'summary', label: 'Sales summary' },
  { id: 'by-item', label: 'Sales by item' },
  { id: 'best-selling', label: 'Best selling' },
  { id: 'by-category', label: 'Sales by category' },
  { id: 'by-staff', label: 'Sales by staff' },
  { id: 'payment-method', label: 'Payment method' },
  { id: 'by-customer', label: 'Sales by customer' },
  { id: 'tax', label: 'Tax' },
  { id: 'expiring', label: 'Expiring inventory' },
  { id: 'valuation', label: 'Inventory valuation' },
<<<<<<< HEAD
=======
  { id: 'expense-analytics', label: 'Expense Analytics' },
  { id: 'liability-analytics', label: 'Liability Analytics' },
>>>>>>> 0d80c3a (Add expense support)
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function thisMonthISO() {
  return new Date().toISOString().slice(0, 7);
}

export default function Reports() {
  const { shopName } = useAuth();
<<<<<<< HEAD
  const [tab, setTab] = useState('summary');
  const [periodMode, setPeriodMode] = useState('day'); // 'day' | 'month'
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(thisMonthISO());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const usesPeriod = tab !== 'expiring' && tab !== 'valuation';
  const params = usesPeriod ? (periodMode === 'day' ? { date } : { month }) : undefined;
  const activeTabLabel = REPORT_TABS.find((t) => t.id === tab)?.label || 'Report';
  const periodLabel = !usesPeriod ? '' : periodMode === 'day' ? date : month;
=======
  const [tab, setTab] = useState('overview');
  const [periodMode, setPeriodMode] = useState('day'); // 'day' | 'month' -- the OLDER reports' picker
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(thisMonthISO());
  const [rangePeriod, setRangePeriod] = useState('this_month'); // the BI layer's picker
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const isRangeTab = RANGE_TABS.has(tab);
  const usesPeriod = !isRangeTab && tab !== 'expiring' && tab !== 'valuation';
  const params = usesPeriod ? (periodMode === 'day' ? { date } : { month }) : undefined;
  const rangeParams = isRangeTab
    ? { period: rangePeriod, ...(rangePeriod === 'custom' ? { start: customStart, end: customEnd } : {}) }
    : undefined;
  const activeTabLabel = REPORT_TABS.find((t) => t.id === tab)?.label || 'Report';
  const periodLabel = isRangeTab
    ? (PERIOD_OPTIONS.find(([v]) => v === rangePeriod)?.[1] || '')
    : !usesPeriod ? '' : periodMode === 'day' ? date : month;
>>>>>>> 0d80c3a (Add expense support)

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
<<<<<<< HEAD
=======
      setLoadError('');
>>>>>>> 0d80c3a (Add expense support)
      setData(null);
      try {
        let res;
        switch (tab) {
<<<<<<< HEAD
=======
          case 'overview': res = await analytics.overview(rangeParams); break;
          case 'expense-analytics': res = await analytics.expenses(rangeParams); break;
          case 'liability-analytics': res = await analytics.liabilities(rangeParams); break;
>>>>>>> 0d80c3a (Add expense support)
          case 'summary': res = await reports.salesSummary(params); break;
          case 'by-item': res = await reports.salesByItem(params); break;
          case 'best-selling': res = await reports.bestSelling(params); break;
          case 'by-category': res = await reports.salesByCategory(params); break;
          case 'by-staff': res = await reports.salesByStaff(params); break;
          case 'payment-method': res = await reports.paymentMethod(params); break;
          case 'by-customer': res = await reports.salesByCustomer(params); break;
          case 'tax': res = await reports.tax(params); break;
          case 'expiring': res = await reports.expiringInventory({ days: 30 }); break;
          case 'valuation': res = await reports.inventoryValuation(); break;
          default: res = { data: null };
        }
        if (!cancelled) setData(res.data);
<<<<<<< HEAD
=======
      } catch (err) {
        if (!cancelled) setLoadError(apiErrorMessage(err, 'Could not load this report.'));
>>>>>>> 0d80c3a (Add expense support)
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
<<<<<<< HEAD
  }, [tab, date, month, periodMode]);
=======
  }, [tab, date, month, periodMode, rangePeriod, customStart, customEnd]);
>>>>>>> 0d80c3a (Add expense support)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-sub">How the shop is really doing</div>
        </div>
        <button className="btn" onClick={() => window.print()} disabled={loading || !data}>
          {Icons.print} Print this report
        </button>
      </div>

      {/* Only rendered onto the page when printing (theme.css) — the screen
          chrome (sidebar, tabs, period picker) doesn't belong on paper, so
          this is what carries the context instead: which report, which
          period, and when it was pulled. */}
      <div className="report-print-header">
        <div className="report-print-shop">{shopName}</div>
        <div className="report-print-title">{activeTabLabel}{periodLabel ? ` — ${periodLabel}` : ''}</div>
        <div className="report-print-meta">Printed {new Date().toLocaleString()}</div>
      </div>

      <div className="report-nav">
        {REPORT_TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

<<<<<<< HEAD
=======
      {isRangeTab && (
        <div className="period-picker" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={rangePeriod} onChange={(e) => setRangePeriod(e.target.value)}>
            {PERIOD_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          {rangePeriod === 'custom' && (
            <>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span style={{ opacity: 0.6 }}>to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </>
          )}
        </div>
      )}
>>>>>>> 0d80c3a (Add expense support)
      {usesPeriod && (
        <div className="period-picker" style={{ marginBottom: 16 }}>
          <select value={periodMode} onChange={(e) => setPeriodMode(e.target.value)}>
            <option value="day">Day</option>
            <option value="month">Month</option>
          </select>
          {periodMode === 'day' ? (
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          ) : (
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          )}
        </div>
      )}

      <div className="section">
        <div className="section-body" style={{ paddingTop: 16 }}>
<<<<<<< HEAD
          {loading || !data ? <div className="empty">Loading…</div> : renderReport(tab, data)}
=======
          {loadError ? <div className="form-error">{loadError}</div> : loading || !data ? <div className="empty">Loading…</div> : renderReport(tab, data)}
>>>>>>> 0d80c3a (Add expense support)
        </div>
      </div>

      <div className="report-print-footer">
        Software by Gavin's Software Solutions (GSS) · ogbejoshua42@gmail.com · 0806 377 3201
      </div>
    </>
  );
}

function renderReport(tab, rawData) {
  // Defensive normalization: guarantees `rows`/`series` are always arrays,
  // so a stale or unexpected response shape can't crash the page.
  const data = { rows: [], series: [], product_sales: 0, service_revenue: 0, ...rawData };
  switch (tab) {
<<<<<<< HEAD
=======
    case 'overview': return <OverviewReport data={data} />;
    case 'expense-analytics': return <ExpenseAnalyticsReport data={data} />;
    case 'liability-analytics': return <LiabilityAnalyticsReport data={data} />;
>>>>>>> 0d80c3a (Add expense support)
    case 'summary': return <SummaryReport data={data} />;
    case 'by-item': return <ByItemReport data={data} />;
    case 'best-selling': return <BestSellingReport data={data} />;
    case 'by-category': return <ByCategoryReport data={data} />;
    case 'by-staff': return <ByStaffReport data={data} />;
    case 'payment-method': return <PaymentMethodReport data={data} />;
    case 'by-customer': return <ByCustomerReport data={data} />;
    case 'tax': return <TaxReport data={data} />;
    case 'expiring': return <ExpiringReport data={data} />;
    case 'valuation': return <ValuationReport data={data} />;
    default: return null;
  }
}

<<<<<<< HEAD
=======
function KpiCard({ label, block, color, invertColor }) {
  const changePct = block?.change_pct;
  const positive = changePct != null && changePct > 0;
  const negative = changePct != null && changePct < 0;
  // For most metrics "up" is good (green). Expenses/COGS are the
  // opposite — spending more is bad news even though the number went up.
  const goodDirection = invertColor ? negative : positive;
  const badDirection = invertColor ? positive : negative;
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <Amount className={`stat-value mono ${color || ''}`} value={block?.value ?? 0} />
      {changePct != null && (
        <div style={{ fontSize: 11.5, marginTop: 4, color: goodDirection ? 'var(--good)' : badDirection ? 'var(--danger)' : 'var(--text-dim)' }}>
          {changePct > 0 ? '▲' : changePct < 0 ? '▼' : '—'} {Math.abs(changePct).toFixed(1)}% vs last period
        </div>
      )}
      {changePct == null && block && 'previous' in block && (
        <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-dim)' }}>Not enough data to compare yet</div>
      )}
    </div>
  );
}

function OverviewReport({ data }) {
  const netProfitPositive = (data.net_profit?.value ?? 0) >= 0;
  return (
    <>
      <div className="stat-grid">
        <KpiCard label="Revenue" block={data.revenue} />
        <KpiCard label="Cost of Goods Sold" block={data.cogs} invertColor />
        <KpiCard label="Gross Profit" block={data.gross_profit} color="good" />
        <KpiCard label="Total Expenses" block={data.total_expenses} invertColor />
      </div>
      <div className="stat-grid cols-2" style={{ marginTop: 12 }}>
        <KpiCard label="Net Profit" block={data.net_profit} color={netProfitPositive ? 'good' : undefined} />
        <KpiCard label="Transactions" block={data.transaction_count} />
      </div>
      <div className="stat-grid cols-2" style={{ marginTop: 12 }}>
        <KpiCard label="Average Transaction Value" block={data.avg_transaction_value} />
        <div className="stat-card"><div className="stat-label">Inventory Value (now)</div><Amount className="stat-value mono" value={data.inventory_value?.value ?? 0} /></div>
      </div>
      <div className="stat-grid" style={{ marginTop: 12 }}>
        <div className="stat-card"><div className="stat-label">Outstanding Liabilities (now)</div><Amount className="stat-value mono warn" value={data.outstanding_liabilities?.value ?? 0} /></div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 14, lineHeight: 1.5 }}>
        Revenue, COGS, gross profit, expenses, net profit, and transactions are compared against the
        immediately preceding period of the same length. Inventory value and outstanding liabilities are
        current balances, not period-over-period flows, so they're shown as-is rather than compared.
      </div>
    </>
  );
}

const EXPENSE_PAYMENT_METHOD_LABEL = { cash: 'Cash', transfer: 'Transfer', pos: 'POS/Card' };

function ExpenseAnalyticsReport({ data }) {
  const byCategory = data.by_category || [];
  const byMethod = data.by_payment_method || [];
  const maxCat = Math.max(1, ...byCategory.map((c) => Number(c.total)));
  return (
    <>
      <div className="stat-card" style={{ maxWidth: 260, marginBottom: 20 }}>
        <div className="stat-label">Total expenses</div>
        <Amount className="stat-value mono warn" value={data.total?.value ?? 0} />
        {data.total?.change_pct != null && (
          <div style={{ fontSize: 11.5, marginTop: 4, color: data.total.change_pct > 0 ? 'var(--danger)' : 'var(--good)' }}>
            {data.total.change_pct > 0 ? '▲' : '▼'} {Math.abs(data.total.change_pct).toFixed(1)}% vs last period
          </div>
        )}
      </div>

      {byCategory.length === 0 ? <div className="empty">No expenses in this period.</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {byCategory.map((c) => (
            <div key={c.category}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 3 }}>
                <span>{c.category}</span><span className="num">{money(c.total)} · {c.count}</span>
              </div>
              <div style={{ height: 7, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(Number(c.total) / maxCat) * 100}%`, background: 'var(--warn)' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {byMethod.length > 0 && (
        <div>
          <h4 style={{ fontSize: 13, marginBottom: 8, opacity: 0.85 }}>By payment method</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {byMethod.map((m) => (
              <div key={m.payment_method} className="low-item">
                <span>{EXPENSE_PAYMENT_METHOD_LABEL[m.payment_method] || m.payment_method}</span>
                <span className="num">{money(m.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

const LIABILITY_CATEGORY_LABEL = {
  rent: 'Shop rent', loan: 'Loan', utility: 'Utility bill',
  salary: 'Staff salary owed', supplier_credit: 'Supplier credit', other: 'Other',
};

function LiabilityAnalyticsReport({ data }) {
  const byCategory = data.by_category || {};
  const byStatus = data.by_status || {};
  const upcoming = data.upcoming_due || [];
  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Outstanding (now)</div><Amount className="stat-value mono warn" value={data.outstanding_total ?? 0} /></div>
        <div className="stat-card"><div className="stat-label">Overdue (now)</div><Amount className="stat-value mono" style={{ color: 'var(--danger)' }} value={data.overdue_total ?? 0} /></div>
        <div className="stat-card"><div className="stat-label">Cleared (all time)</div><Amount className="stat-value mono good" value={byStatus.cleared ?? 0} /></div>
        <div className="stat-card"><div className="stat-label">Paid this period</div><Amount className="stat-value mono" value={data.payments_in_period?.value ?? 0} /></div>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Outstanding by category</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(byCategory).map(([cat, total]) => (
              <div key={cat} className="low-item">
                <span>{LIABILITY_CATEGORY_LABEL[cat] || cat}</span>
                <span className="num">{money(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: 13, marginBottom: 8, opacity: 0.85 }}>Due in the next 14 days</h4>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Due</th><th>Outstanding</th></tr></thead>
              <tbody>
                {upcoming.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td><td>{LIABILITY_CATEGORY_LABEL[u.category] || u.category}</td>
                    <td className="mono">{u.due_date}</td><td className="num">{money(u.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.outstanding_total === 0 && upcoming.length === 0 && (
        <div className="empty" style={{ marginTop: 20 }}>Nothing outstanding right now.</div>
      )}
    </>
  );
}

>>>>>>> 0d80c3a (Add expense support)
function SummaryReport({ data }) {
  const maxSales = Math.max(1, ...data.series.map((p) => p.sales));
  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Total sales</div><Amount className="stat-value mono" value={data.total_sales} /></div>
        <div className="stat-card"><div className="stat-label">Product sales</div><Amount className="stat-value mono" value={data.product_sales} /></div>
        <div className="stat-card"><div className="stat-label">Service revenue</div><Amount className="stat-value mono good" value={data.service_revenue} /></div>
        <div className="stat-card"><div className="stat-label">Gross profit</div><Amount className="stat-value mono good" value={data.gross_profit} /></div>
      </div>
      <div className="stat-grid cols-2">
        <div className="stat-card"><div className="stat-label">Number of sales</div><div className="stat-value mono">{data.number_of_sales}</div></div>
        <div className="stat-card"><div className="stat-label">Items sold</div><div className="stat-value mono">{data.items_sold}</div></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, padding: '0 2px' }}>
        {data.series.map((p, idx) => (
          <div key={idx} title={`${p.label}: ${money(p.sales)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ background: p.sales > 0 ? 'var(--accent)' : 'var(--surface-2)', borderRadius: '3px 3px 0 0', height: `${Math.max(2, (p.sales / maxSales) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
        <span>{data.series[0]?.label}</span>
        <span>{data.series[data.series.length - 1]?.label}</span>
      </div>
    </>
  );
}

function ByItemReport({ data }) {
  if (!data.rows.length) return <div className="empty">No sales in this period.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Item</th><th>Category</th><th>Total sold</th><th>Gross sale amt</th><th>Cost price</th><th>Gross profit</th><th>Discount</th><th>Margin</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.item_name}</td><td>{r.category}</td><td className="num">{r.total_sold}</td>
              <td className="num">{money(r.gross_sale_amt)}</td><td className="num">{money(r.cost_price)}</td>
              <td className="num" style={{ color: 'var(--good)' }}>{money(r.gross_profit)}</td>
              <td className="num">{money(r.discount)}</td><td className="num">{r.margin}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BestSellingReport({ data }) {
  if (!data.rows.length) return <div className="empty">No sales in this period.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.rows.map((r) => (
        <div key={r.rank} className="low-item">
          <span><span className="mono" style={{ color: 'var(--accent)', marginRight: 10 }}>#{r.rank}</span>{r.item_name}</span>
          <span className="num">{r.total_sold} sold · {money(r.gross_sale_amt)}</span>
        </div>
      ))}
    </div>
  );
}

function ByCategoryReport({ data }) {
  if (!data.rows.length) return <div className="empty">No sales in this period.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Category</th><th>Total sold</th><th>Gross sale amt</th><th>Gross profit</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}><td>{r.category}</td><td className="num">{r.total_sold}</td><td className="num">{money(r.gross_sale_amt)}</td><td className="num" style={{ color: 'var(--good)' }}>{money(r.gross_profit)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ByStaffReport({ data }) {
  if (!data.rows.length) return <div className="empty">No sales in this period.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Staff</th><th>Number of sales</th><th>Gross sale amt</th><th>Gross profit</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}><td>{r.staff_name}</td><td className="num">{r.number_of_sales}</td><td className="num">{money(r.gross_sale_amt)}</td><td className="num" style={{ color: 'var(--good)' }}>{money(r.gross_profit)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentMethodReport({ data }) {
  if (!data.rows.length) return <div className="empty">No sales in this period.</div>;
  const labels = { cash: 'Cash', transfer: 'Transfer', pos: 'POS/Card' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.rows.map((r, i) => (
        <div key={i} className="low-item"><span>{labels[r.payment_method] || r.payment_method}</span><span className="num">{r.count} sales · {money(r.total)}</span></div>
      ))}
    </div>
  );
}

function ByCustomerReport({ data }) {
  if (!data.rows.length) return <div className="empty">No sales in this period.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Customer</th><th>Number of sales</th><th>Total spent</th><th>Outstanding balance</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.customer_name}</td><td className="num">{r.number_of_sales}</td><td className="num">{money(r.total_spent)}</td>
              <td className="num" style={{ color: r.outstanding_balance > 0 ? 'var(--warn)' : undefined }}>{money(r.outstanding_balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaxReport({ data }) {
  return (
    <>
      <div className="stat-card" style={{ marginBottom: 16, maxWidth: 260 }}>
        <div className="stat-label">Total tax collected</div>
        <Amount className="stat-value mono" value={data.total_tax_collected} />
      </div>
      {data.rows.length === 0 ? <div className="empty">No sales in this period.</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Tax rate</th><th>Taxable sales</th><th>Tax collected</th><th>Count</th></tr></thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}><td>{r.tax_rate}%</td><td className="num">{money(r.taxable_sales)}</td><td className="num">{money(r.tax_collected)}</td><td className="num">{r.count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ExpiringReport({ data }) {
  if (!data.rows.length) return <div className="empty">Nothing expiring in the next {data.horizon_days} days.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead><tr><th>Item</th><th>Batch</th><th>Qty left</th><th>Expiry</th><th>Days left</th></tr></thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.item_name}</td><td className="mono">{r.batch_number}</td><td className="num">{r.quantity_remaining}</td>
              <td className="mono">{r.expiry_date}</td>
              <td className="num" style={{ color: r.is_expired ? 'var(--danger)' : r.days_left <= 7 ? 'var(--warn)' : undefined, fontWeight: 700 }}>
                {r.is_expired ? 'Expired' : `${r.days_left}d`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValuationReport({ data }) {
  return (
    <>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Total inventory value</div><Amount className="stat-value mono" value={data.total_inventory_value} /></div>
        <div className="stat-card"><div className="stat-label">Total selling price value</div><Amount className="stat-value mono" value={data.total_selling_price_value} /></div>
        <div className="stat-card"><div className="stat-label">Potential profit</div><Amount className="stat-value mono good" value={data.potential_profit} /></div>
        <div className="stat-card"><div className="stat-label">Margin</div><div className="stat-value mono">{data.margin}%</div></div>
      </div>
      {data.rows.length === 0 ? <div className="empty">No inventory yet.</div> : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Item</th><th>Category</th><th>In stock</th><th>Cost</th><th>Inventory value</th><th>Selling value</th><th>Potential profit</th><th>Margin</th></tr></thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.item_name}</td><td>{r.category}</td><td className="num">{r.in_stock}</td><td className="num">{money(r.cost)}</td>
                  <td className="num">{money(r.inventory_value)}</td><td className="num">{money(r.total_selling_price_value)}</td>
                  <td className="num" style={{ color: 'var(--good)' }}>{money(r.potential_profit)}</td><td className="num">{r.margin}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
