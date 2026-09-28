import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errorField } from '../api/errors';
import '../marketing.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/app');
    } catch (err) {
      const data = err.response?.data;
      const code = errorField(data, 'code');
      if (code === 'email_not_verified') {
        // Correct password, but RegisterView's OTP step was never
        // completed — send them to finish that instead of a dead-end
        // "incorrect password" message (see core.auth_serializers).
        navigate('/verify-email', { state: { email: errorField(data, 'email') || '' } });
        return;
      }
      // Any other 4xx (device-pairing errors, etc.) has a real, specific
      // `detail` from the backend — show that instead of masking it.
      // A response with no usable `detail` (network error, CORS failure,
      // 5xx) falls back to the generic message.
      setError(errorField(data, 'detail') || 'Incorrect username or password.');
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
            "I know exactly what's in stock, what's owed, and what came in today — before I even open my laptop."
          </div>
          <div className="lp-auth-quote-attr">— a shop owner running GSS</div>
        </div>
      </div>

      <div className="lp-auth-main">
        <div className="lp-auth-card">
          <h1>Welcome back</h1>
          <p>Sign in to manage stock, service jobs, and sales.</p>
          {error && <div className="lp-auth-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="lp-field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus autoComplete="username" />
            </div>
            <div className="lp-field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button className="lp-btn lp-btn-signal lp-btn-wide" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="lp-auth-switch">
            Don't have a shop set up yet? <Link to="/signup">Get started free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
