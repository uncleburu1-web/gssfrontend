import { Link } from 'react-router-dom';

/**
 * Shown instead of the app once the subscription has ended (there is no grace period). Small on
 * purpose: one message, one action. The owner/CEO goes to Billing; everyone else is told who can
 * fix it. The desktop till keeps selling regardless and uploads everything once renewed.
 */
export default function SubscriptionEndedCard({ sub, isCeo, onLogout }) {
  const trial = sub?.status === 'trial';
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
      <div className="branded-card" style={{ maxWidth: 380, width: '100%', padding: 24, textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 8px' }}>{trial ? 'Your free trial has ended' : 'Your subscription has ended'}</h3>
        <p className="page-sub" style={{ margin: '0 0 18px' }}>
          {isCeo
            ? 'Subscribe to keep using Benchline online. Your desktop till keeps selling, and everything it records uploads as soon as you subscribe.'
            : 'Ask the business owner to subscribe to keep using Benchline online. The desktop till keeps selling in the meantime.'}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {isCeo && <Link className="btn" to="/app/billing">Subscribe</Link>}
          <button className="btn ghost" onClick={onLogout}>Log out</button>
        </div>
      </div>
    </div>
  );
}
