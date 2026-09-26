import { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorDetail } from '../api/errors';
import '../marketing.css';

const RESEND_COOLDOWN_SECONDS = 60; // matches core.models.EmailOTP.RESEND_COOLDOWN_SECONDS

export default function VerifyEmail() {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    if (code.trim().length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email.trim(), code.trim());
      navigate('/app/receipt-setup', { state: { onboarding: true } });
    } catch (err) {
      setError(errorDetail(err, 'Could not verify that code. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('Enter the email you signed up with.');
      return;
    }
    setResending(true);
    try {
      const data = await resendOtp(email.trim());
      setNotice(data?.detail || 'A new code is on its way.');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(errorDetail(err, 'Could not send a new code right now.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="lp-root lp-auth-shell">
      <div className="lp-auth-side">
        <div className="lp-auth-side-top">
          <Link to="/" className="lp-logo">
            <img src="/logo.png" alt="GSS" className="lp-logo-img" />
          </Link>
        </div>
        <div>
          <div className="lp-auth-quote">
            "One code, and my shop was live — no back-and-forth with support."
          </div>
          <div className="lp-auth-quote-attr">— a shop owner running GSS</div>
        </div>
      </div>

      <div className="lp-auth-main">
        <div className="lp-auth-card">
          <h1>Confirm your email</h1>
          <p>Enter the 6-digit code we sent to your email. It expires in 10 minutes.</p>
          {error && <div className="lp-auth-error">{error}</div>}
          {notice && <div className="lp-field-hint" style={{ marginBottom: 16 }}>{notice}</div>}
          <form onSubmit={handleSubmit}>
            <div className="lp-field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!email}
                autoComplete="email"
              />
            </div>
            <div className="lp-field">
              <label>6-digit code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoFocus={!!email}
                autoComplete="one-time-code"
                placeholder="123456"
                style={{ letterSpacing: '4px', fontSize: '20px', textAlign: 'center' }}
              />
            </div>
            <button className="lp-btn lp-btn-signal lp-btn-wide" type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>
          <div className="lp-auth-switch">
            Didn't get a code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--lp-signal-dim)', fontWeight: 600, cursor: cooldown > 0 ? 'default' : 'pointer' }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : resending ? 'Sending…' : 'Send a new code'}
            </button>
          </div>
          <div className="lp-auth-switch">
            Wrong email or already verified? <Link to="/login">Back to log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
