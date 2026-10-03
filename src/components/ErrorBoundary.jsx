import { Component } from 'react';

/**
 * No error boundary existed anywhere in this app before — any uncaught
 * exception during render, anywhere in the tree, unmounted everything and
 * left a blank white page. This is the standard fix for that entire class
 * of bug: whatever throws next, the person sees a recoverable screen
 * instead of a dead page, with the actual error visible right here so it
 * can be reported and fixed instead of remaining an unreproducible "it
 * just went blank."
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 24, textAlign: 'center', gap: 14, background: '#111', color: '#eee',
      }}>
        <div style={{ fontSize: 40 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Something went wrong</div>
        <div style={{ fontSize: 13, opacity: 0.75, maxWidth: 420 }}>
          The app hit an unexpected error and had to stop. Anything already saved (like a completed sale)
          is safe — this only affects what's on screen right now.
        </div>
        <details style={{ fontSize: 11, opacity: 0.6, maxWidth: 420, textAlign: 'left', whiteSpace: 'pre-wrap' }}>
          <summary style={{ cursor: 'pointer' }}>Technical details</summary>
          {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
        </details>
        <button
          onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          style={{
            marginTop: 8, padding: '10px 22px', borderRadius: 8, border: 'none',
            background: '#4fa3e3', color: '#fff', fontWeight: 700, fontSize: 14,
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
