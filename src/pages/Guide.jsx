import { Link } from 'react-router-dom';
import '../marketing.css';

const STEPS = [
  {
    title: 'Create your shop',
    body: "Give your shop a name, pick the business type closest to what you sell (gadgets, pharmacy, clothing, or general), and set your owner login.",
    rows: [
      ['Shop name', "Chidi's Gadget Store"],
      ['Business type', 'Gadgets & electronics'],
    ],
  },
  {
    title: 'Add your first products',
    body: 'Log what you actually have on the shelf — a name, a category, and how many units. Add cost and selling price as a batch, so profit is worked out for you.',
    rows: [
      ['HP EliteBook 840 · Batch #0001', '12 units'],
      ['Cost / Selling price', '₦210,000 / ₦255,000'],
    ],
  },
  {
    title: 'Make your first sale',
    body: 'Ring it up from the till — tap a product or scan its barcode, take cash, card, or an installment, and print or share the receipt.',
    rows: [
      ['USB-C Charger 65W x1', '₦18,000'],
      ['Payment', 'Cash'],
    ],
  },
  {
    title: 'Log a repair or service job',
    body: 'If you fix things too — track the device, the issue, and a quote, and move it from diagnosis through to ready-for-pickup.',
    rows: [
      ['Dell Inspiron 15 — cracked screen', 'In service'],
    ],
  },
  {
    title: 'Bring your team in',
    body: "Add workers with their own logins, so you can see who rang up what — without handing out your owner password.",
    rows: [
      ['Amaka O. — Cashier', 'Active'],
    ],
  },
  {
    title: 'Check your numbers',
    body: "Open Reports whenever you need the real picture — stock value, what's owed to you, what you owe, and how the shop's actually doing.",
    rows: [
      ['Net position', '₦1,668,500'],
    ],
  },
];

export default function Guide() {
  return (
    <div className="lp-root">
      <header className="lp-header">
        <Link to="/" className="lp-logo">
          <img src="/logo.png" alt="GSS" className="lp-logo-img" />
        </Link>
        <nav className="lp-nav">
          <div className="lp-nav-links">
            <Link to="/guide">Guide</Link>
            <Link to="/about">About</Link>
          </div>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-ghost">Log in</Link>
            <Link to="/signup" className="lp-btn lp-btn-signal">Get started free</Link>
          </div>
        </nav>
      </header>

      <section className="guide-hero">
        <span className="lp-feature-tag">Getting started</span>
        <h1>From nothing to your first sale in about ten minutes.</h1>
        <p>Six steps, in order. Nothing here needs a card on file, and you can stop after any step and pick up later.</p>
      </section>

      <div className="guide-list">
        {STEPS.map((step, i) => (
          <div className="guide-item" key={step.title}>
            <div className="guide-num">{i + 1}</div>
            <div className="guide-content">
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              <div className="guide-visual">
                {step.rows.map(([label, value]) => (
                  <div className="lp-mock-line" key={label}><span>{label}</span><span>{value}</span></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="guide-cta">
        <div className="guide-cta-inner">
          <h2>Ready to put your shop on this?</h2>
          <p>Free for a month, no card needed.</p>
          <Link to="/signup" className="lp-btn lp-btn-on-dark lp-btn-wide">Try free for 1 month</Link>
        </div>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-credit">Gavin's Software Solutions (GSS)</div>
        <div className="lp-footer-links">
          <Link to="/about">About</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Get started</Link>
          <a href="mailto:ogbejoshua42@gmail.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
