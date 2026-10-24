import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorDetail } from '../api/errors';
import { SHOP_TYPES, shopType } from '../utils/shopTypes';
import '../marketing.css';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('');
  const [businessType, setBusinessType] = useState('gadgets');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register({ shop_name: shopName, business_type: businessType, full_name: fullName, username, email, password });
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      setError(errorDetail(err, 'Could not create your account — check the fields and try again.'));
    } finally {
      setLoading(false);
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
            "Set up took less time than the first delivery I logged in it."
          </div>
          <div className="lp-auth-quote-attr">— a shop owner running GSS</div>
        </div>
      </div>

      <div className="lp-auth-main">
        <div className="lp-auth-card">
          <h1>Set up your shop</h1>
          <p>Free for your first month — no card required.</p>
          {error && <div className="lp-auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="lp-field">
              <label>Shop name</label>
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} required autoFocus placeholder="e.g. Chidi's Gadget Store" />
            </div>
            <div className="lp-field">
              <label>What kind of shop do you run?</label>
              <select aria-label="Kind of shop" value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                {SHOP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <div className="lp-field-hint">
                {shopType(businessType).hint} Running more than one kind? Each branch you add later picks its own.
              </div>
            </div>
            <div className="lp-field">
              <label>Your name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Optional — defaults to your username" />
            </div>
            <div className="lp-field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
            </div>
            <div className="lp-field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
              <div className="lp-field-hint">We'll send a 6-digit code here to confirm it's you.</div>
            </div>
            <div className="lp-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
              <div className="lp-field-hint">At least 8 characters.</div>
            </div>
            <button className="lp-btn lp-btn-signal lp-btn-wide" type="submit" disabled={loading}>
              {loading ? 'Setting up your shop…' : 'Create my shop'}
            </button>
          </form>
          <div className="lp-auth-switch">
            Already have a shop set up? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
