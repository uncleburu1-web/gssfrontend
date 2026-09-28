import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subscription } from '../api/endpoints';
import { useLive } from '../context/LiveContext';
import { money, fmtDate } from '../utils/format';
import { Icons } from '../components/Icons';

const STATUS_LABEL = {
  trial: 'Free trial',
  active: 'Active',
  grace: 'Grace period',
  expired: 'Expired',
  suspended: 'Suspended',
  cancelled: 'Cancelled',
};

export default function Billing() {
  const [sub, setSub] = useState(null);
  const [cycle, setCycle] = useState('yearly');
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [verifyResult, setVerifyResult] = useState(null); // 'success' | 'failed' | null
  const { versions } = useLive();

  function load() {
    setLoading(true);
    subscription.status().then(({ data }) => {
      setSub(data);
      setCycle(data.billing_cycle || 'yearly'); // default the toggle to whatever they're already on
      setLoading(false);
    });
  }

  useEffect(load, [versions.subscription]);

  // Returning from Paystack checkout lands back here with ?reference=xxx
  // (Paystack appends it to whatever callback_url we sent). Verify it
  // directly rather than waiting on the webhook, so the owner sees
  // confirmation immediately -- see subscription/views.py's comment on why
  // both paths exist and are safe to race.
  useEffect(() => {
    const reference = searchParams.get('reference');
    if (!reference) return;
    subscription.verify(reference)
      .then(({ data }) => {
        setVerifyResult('success');
        setSub(data.subscription);
      })
      .catch(() => setVerifyResult('failed'))
      .finally(() => {
        searchParams.delete('reference');
        setSearchParams(searchParams, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubscribe() {
    setError('');
    setRedirecting(true);
    try {
      const callbackUrl = `${window.location.origin}/app/billing`;
      const { data } = await subscription.checkout(callbackUrl, cycle);
      window.location.href = data.authorization_url;
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not start checkout -- try again.');
      setRedirecting(false);
    }
  }

  if (loading || !sub) return <div className="section-body"><div className="empty">Loading…</div></div>;

  const daysLeft = sub.current_period_end
    ? Math.ceil((new Date(sub.current_period_end) - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  const isTrial = sub.effective_status === 'trial';
  const trialEndingSoon = isTrial && daysLeft != null && daysLeft <= 7;

  // pricing comes from the backend (subscriptions/models.py PRICING_NGN) —
  // never hardcoded here, so a price change on the server is reflected
  // immediately with no frontend deploy needed.
  const pricing = sub.pricing || { monthly: { base: 0, additional_branch: 0 }, yearly: { base: 0, additional_branch: 0 } };
  const addOns = sub.additional_branches || 0;
  const priceFor = (c) => pricing[c].base + addOns * pricing[c].additional_branch;
  const savingsPct = pricing.monthly.base > 0
    ? Math.round((1 - pricing.yearly.base / (pricing.monthly.base * 12)) * 100)
    : 0;

  return (
    <div className="section">
      <div className="topbar">
        <div>
          <div className="page-title">Billing</div>
          <div className="page-sub">Cloud sync &amp; the CEO app -- the desktop keeps selling either way</div>
        </div>
      </div>

      {verifyResult === 'success' && (
        <div className="banner good" style={{ marginBottom: 16 }}>
          Payment confirmed -- subscription updated.
        </div>
      )}
      {verifyResult === 'failed' && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
          We couldn't confirm that payment yet. If money left your account, it'll still be picked up shortly -- check back in a minute.
        </div>
      )}
      {error && <div className="form-error">{error}</div>}

      <div className="section-body" style={{ maxWidth: 520 }}>
        <div className="stat-card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="stat-label">Status</div>
            <span className={`badge ${sub.effective_status}`}>{STATUS_LABEL[sub.effective_status] || sub.effective_status}</span>
          </div>
          {sub.current_period_end && (
            <div style={{ fontSize: 12.5, color: trialEndingSoon ? 'var(--warn)' : 'var(--text-dim)', marginTop: 8, fontWeight: trialEndingSoon ? 600 : 400 }}>
              {sub.effective_status === 'expired'
                ? `Expired ${fmtDate(sub.current_period_end)}`
                : isTrial
                  ? `Your free trial ends ${fmtDate(sub.current_period_end)}${daysLeft != null && daysLeft >= 0 ? ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}`
                  : `Renews ${fmtDate(sub.current_period_end)}${daysLeft != null && daysLeft >= 0 ? ` (${daysLeft} day${daysLeft === 1 ? '' : 's'})` : ''}`}
            </div>
          )}
          {!sub.cloud_services_enabled && (
            <div style={{ fontSize: 12.5, color: 'var(--warn)', marginTop: 8 }}>
              Cloud sync and the CEO app are paused. Selling on the desktop still works normally.
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="stat-label" style={{ marginBottom: 10 }}>Choose a plan</div>

          <div className="tabs" style={{ marginBottom: 14 }}>
            <button type="button" className={`tab ${cycle === 'monthly' ? 'active' : ''}`} onClick={() => setCycle('monthly')}>
              Monthly
            </button>
            <button type="button" className={`tab ${cycle === 'yearly' ? 'active' : ''}`} onClick={() => setCycle('yearly')}>
              Yearly {savingsPct > 0 && <span style={{ color: 'var(--good)', fontWeight: 700 }}>· Save {savingsPct}%</span>}
            </button>
          </div>

          <div style={{ fontSize: 30, fontWeight: 700, margin: '6px 0' }}>
            {money(priceFor(cycle))}
            <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-dim)' }}> / {cycle === 'monthly' ? 'month' : 'year'}</span>
          </div>
          {addOns > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>
              {money(pricing[cycle].base)} base + {addOns} extra branch{addOns === 1 ? '' : 'es'} at {money(pricing[cycle].additional_branch)} each
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 14 }}>
            Covers backend hosting &amp; database -- desktop sales, stock, and cash register never depend on this being paid.
          </div>
          <button className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubscribe} disabled={redirecting}>
            {Icons.billing} {redirecting ? 'Redirecting to Paystack…' : sub.effective_status === 'active' ? 'Renew early' : 'Subscribe now'}
          </button>
        </div>
      </div>
    </div>
  );
}
