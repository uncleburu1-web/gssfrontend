import { Link } from 'react-router-dom';
import '../marketing.css';

// A single deliberate illustrated moment (see the "why shops switch"
// section below) rather than a stock photo — keeps it on-brand with the
// rest of the page's ledger palette and needs no image hosting. Left
// panel: a paper ledger, messy handwriting, crossed out. Right panel:
// the same ledger, clean, on a phone.
function PaperToDigital() {
  return (
    <svg viewBox="0 0 900 380" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A paper ledger crossed out, replaced by the same records clean on a phone">
      <g transform="translate(30,20)">
        <g transform="rotate(-5 190 190)">
          <rect x="60" y="30" width="260" height="320" rx="6" fill="var(--lp-paper)" stroke="var(--lp-border)" strokeWidth="2.5" />
          <circle cx="60" cy="60" r="5" fill="none" stroke="var(--lp-border)" strokeWidth="2.5" />
          <circle cx="60" cy="100" r="5" fill="none" stroke="var(--lp-border)" strokeWidth="2.5" />
          <circle cx="60" cy="140" r="5" fill="none" stroke="var(--lp-border)" strokeWidth="2.5" />
          <circle cx="60" cy="180" r="5" fill="none" stroke="var(--lp-border)" strokeWidth="2.5" />
          <circle cx="60" cy="220" r="5" fill="none" stroke="var(--lp-border)" strokeWidth="2.5" />
          <circle cx="60" cy="260" r="5" fill="none" stroke="var(--lp-border)" strokeWidth="2.5" />
          <circle cx="60" cy="300" r="5" fill="none" stroke="var(--lp-border)" strokeWidth="2.5" />
          <line x1="90" y1="75" x2="300" y2="75" stroke="var(--lp-border)" strokeWidth="1.5" />
          <line x1="90" y1="110" x2="300" y2="110" stroke="var(--lp-border)" strokeWidth="1.5" />
          <line x1="90" y1="145" x2="300" y2="145" stroke="var(--lp-border)" strokeWidth="1.5" />
          <line x1="90" y1="180" x2="300" y2="180" stroke="var(--lp-border)" strokeWidth="1.5" />
          <line x1="90" y1="215" x2="300" y2="215" stroke="var(--lp-border)" strokeWidth="1.5" />
          <line x1="90" y1="250" x2="300" y2="250" stroke="var(--lp-border)" strokeWidth="1.5" />
          <line x1="90" y1="285" x2="300" y2="285" stroke="var(--lp-border)" strokeWidth="1.5" />
          <path d="M92 68 q6 -10 12 -2 t12 -2 t12 -2 t12 -2 t12 -2" stroke="var(--lp-text-dim)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M92 103 q5 -8 10 0 t10 0 t10 0" stroke="var(--lp-text-dim)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M92 138 q6 -9 12 -1 t12 -1 t12 -1 t12 -1 t12 -1 t12 -1" stroke="var(--lp-text-dim)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M92 173 q5 -7 10 0 t10 0 t10 0 t10 0" stroke="var(--lp-text-dim)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M92 208 q6 -9 12 -1 t12 -1 t12 -1 t12 -1" stroke="var(--lp-text-dim)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="255" cy="245" r="20" fill="none" stroke="#B8631F" strokeWidth="2" opacity="0.35" />
          <path d="M92 278 q6 -8 12 0 t12 0 t12 0" stroke="var(--lp-text-dim)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <line x1="88" y1="272" x2="180" y2="284" stroke="#C4453D" strokeWidth="2" opacity="0.7" />
        </g>

        <g transform="translate(255,300) rotate(-32)">
          <rect x="0" y="0" width="10" height="80" rx="5" fill="var(--lp-ink)" />
          <polygon points="0,80 10,80 5,94" fill="var(--lp-ink)" />
          <rect x="0" y="0" width="10" height="18" rx="4" fill="var(--lp-signal)" />
        </g>
        {/* hand gripping the pen: fist as a rounded capsule wrapping the
            shaft, thumb as a small overlapping circle, so it silhouettes
            clearly instead of reading as a blob */}
        <g transform="translate(261,312) rotate(-32)">
          <rect x="-19" y="-15" width="38" height="34" rx="17" fill="var(--lp-text)" />
          <circle cx="-15" cy="-14" r="10" fill="var(--lp-text)" />
          <rect x="-4" y="-33" width="8" height="20" rx="4" fill="var(--lp-text)" />
        </g>

        <line x1="40" y1="330" x2="330" y2="45" stroke="#C4453D" strokeWidth="9" strokeLinecap="round" opacity="0.88" />
        <circle cx="315" cy="55" r="21" fill="#C4453D" />
        <path d="M306 46 L324 64 M324 46 L306 64" stroke="#F1ECDF" strokeWidth="4" strokeLinecap="round" />
      </g>

      <g transform="translate(420,190)">
        <path d="M0 20 H70 M50 4 L70 20 L50 36" fill="none" stroke="var(--lp-signal)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* finger bumps first, so the phone body (drawn next) tucks in
          front of them and only their rounded tips peek past its left edge */}
      <g>
        <ellipse cx="533" cy="150" rx="14" ry="11" fill="var(--lp-text)" />
        <ellipse cx="530" cy="182" rx="15" ry="12" fill="var(--lp-text)" />
        <ellipse cx="533" cy="216" rx="14" ry="11" fill="var(--lp-text)" />
        <rect x="524" y="140" width="26" height="90" rx="13" fill="var(--lp-text)" />
      </g>
      <g transform="translate(540,40)">
        <rect x="0" y="0" width="220" height="300" rx="24" fill="var(--lp-ink)" />
        <rect x="10" y="16" width="200" height="268" rx="6" fill="#1E2420" />
        <g>
          <rect x="24" y="32" width="90" height="10" rx="3" fill="var(--lp-paper-text)" opacity="0.9" />
          <rect x="24" y="58" width="172" height="1.5" fill="rgba(239,233,218,0.18)" />
          <rect x="24" y="72" width="70" height="8" rx="3" fill="var(--lp-paper-text-dim)" />
          <rect x="150" y="72" width="46" height="8" rx="3" fill="var(--lp-paper-text)" />
          <rect x="24" y="92" width="172" height="1.5" fill="rgba(239,233,218,0.18)" />
          <rect x="24" y="106" width="80" height="8" rx="3" fill="var(--lp-paper-text-dim)" />
          <rect x="150" y="106" width="46" height="8" rx="3" fill="var(--lp-paper-text)" />
          <rect x="24" y="126" width="172" height="1.5" fill="rgba(239,233,218,0.18)" />
          <rect x="24" y="140" width="60" height="8" rx="3" fill="var(--lp-paper-text-dim)" />
          <rect x="150" y="140" width="46" height="8" rx="3" fill="var(--lp-paper-text)" />
          <rect x="24" y="166" width="172" height="1.5" fill="rgba(239,233,218,0.3)" />
          <rect x="24" y="180" width="55" height="10" rx="3" fill="var(--lp-signal)" />
          <rect x="140" y="180" width="56" height="10" rx="3" fill="var(--lp-signal)" />
        </g>
        <circle cx="196" cy="24" r="20" fill="var(--lp-green)" />
        <path d="M186 24 L193 31 L207 15" fill="none" stroke="#F1ECDF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* thumb, drawn after the phone so it overlaps the front of the
          right edge — the standard "holding a phone" read */}
      <ellipse cx="756" cy="190" rx="16" ry="22" fill="var(--lp-text)" />
    </svg>
  );
}

export default function Landing() {
  return (
    <div className="lp-root">
      <header className="lp-header">
        <Link to="/" className="lp-logo">
          <img src="/logo.png" alt="GSS" className="lp-logo-img" />
        </Link>
        <nav className="lp-nav">
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#platforms">Platforms</a>
            <a href="#pricing">Pricing</a>
            <Link to="/guide">Guide</Link>
            <Link to="/about">About</Link>
          </div>
          <div className="lp-nav-actions">
            <Link to="/login" className="lp-btn lp-btn-ghost">Log in</Link>
            <a href="#pricing" className="lp-btn lp-btn-signal">Get started free</a>
          </div>
        </nav>
      </header>

      <section className="lp-hero">
        <div>
          <h1>Run your shop without losing track of the money.</h1>
          <p>
            GSS keeps your stock, sales, service jobs, and what you're owed in one place —
            updated the moment anything happens, whether that's a sale on the counter or a
            new batch coming in.
          </p>
          <div className="lp-hero-ctas">
            <a href="#pricing" className="lp-btn lp-btn-signal">Get started free</a>
            <a href="#how-it-works" className="lp-btn lp-btn-ghost">See how it works</a>
          </div>
        </div>

        <div className="lp-tally">
          <div className="lp-tally-head">
            <span>Today's ledger</span>
            <span>Chidi's Gadget Store</span>
          </div>
          <div className="lp-tally-row"><span>Stock on hand</span><span className="lp-mono">₦1,626,000</span></div>
          <div className="lp-tally-row"><span>Sales today</span><span className="lp-mono">₦42,500</span></div>
          <div className="lp-tally-row"><span>Open service tickets</span><span className="lp-mono">3</span></div>
          <div className="lp-tally-row"><span>Owing to you</span><span className="lp-mono">₦0</span></div>
          <div className="lp-tally-total"><span>Net position</span><span className="lp-mono">₦1,668,500</span></div>
        </div>
      </section>

      <section className="lp-switch">
        <div className="lp-switch-inner">
          <div className="lp-switch-copy">
            <span className="lp-feature-tag lp-switch-tag">Why shops switch</span>
            <h2>The exercise book was never going to survive a rainy season.</h2>
            <p>
              Torn pages, faded biro, no backup if it goes missing — and no way to tell,
              at a glance, what you're actually worth. Every sale, every credit, every
              batch goes into GSS instead, the moment it happens.
            </p>
            <ul>
              <li>Nothing to lose to rain, fire, or a page torn out</li>
              <li>Every worker's till, in one place, in real time</li>
              <li>Numbers you can actually trust when it's time to restock</li>
            </ul>
          </div>
          <div className="lp-switch-visual">
            <PaperToDigital />
          </div>
        </div>
      </section>

      <section className="lp-features" id="features">
        <div className="lp-feature-row">
          <div className="lp-feature-copy">
            <span className="lp-feature-tag">Inventory</span>
            <h3>Stock that tracks itself in batches, not just totals.</h3>
            <p>
              Every delivery becomes its own batch, with its own cost price and expiry date —
              so you always know which stock to sell first, and you'll be warned before
              anything expires or runs low.
            </p>
          </div>
          <div className="lp-feature-visual">
            <div className="lp-mock-line"><span>HP EliteBook 840 · Batch #0417</span><span className="lp-mono">6 left</span></div>
            <div className="lp-mock-line"><span>Paracetamol 500mg · Batch #0392</span><span className="lp-mock-tag lp-warn">Expiring soon</span></div>
            <div className="lp-mock-line"><span>USB-C Charger 65W</span><span className="lp-mock-tag">Low stock</span></div>
          </div>
        </div>

        <div className="lp-feature-row lp-reverse">
          <div className="lp-feature-copy">
            <span className="lp-feature-tag">Sales</span>
            <h3>Cash, card, or installment — and a receipt that actually prints.</h3>
            <p>
              Ring up a sale, split it across payment types, and send a real receipt straight
              to a Bluetooth thermal printer — no cloud print service, no extra hardware setup.
            </p>
          </div>
          <div className="lp-feature-visual">
            <div className="lp-mock-line"><span>2 x Samsung A14 screen</span><span className="lp-mono">₦18,000</span></div>
            <div className="lp-mock-line"><span>Payment</span><span className="lp-mono">Installment</span></div>
            <div className="lp-mock-line"><span>Balance due</span><span className="lp-mono">₦4,000</span></div>
          </div>
        </div>

        <div className="lp-feature-row">
          <div className="lp-feature-copy">
            <span className="lp-feature-tag">Service</span>
            <h3>Every device tracked from drop-off to pickup.</h3>
            <p>
              Log the issue, quote a price, and move the ticket through diagnosis, service, and
              ready-for-pickup — with partial payments recorded as they come in.
            </p>
          </div>
          <div className="lp-feature-visual">
            <div className="lp-mock-line"><span>Dell Inspiron 15 — cracked screen</span><span className="lp-mock-tag">In service</span></div>
            <div className="lp-mock-line"><span>Customer</span><span>Chidinma O.</span></div>
            <div className="lp-mock-line"><span>Quoted</span><span className="lp-mono">₦25,000</span></div>
          </div>
        </div>

        <div className="lp-feature-row lp-reverse">
          <div className="lp-feature-copy">
            <span className="lp-feature-tag">Reports & liabilities</span>
            <h3>See what the shop is actually worth, not just what it sold.</h3>
            <p>
              Weigh your stock and receivables against what you owe — rent, loans, supplier
              credit — so you know your real risk, not just today's revenue number.
            </p>
          </div>
          <div className="lp-feature-visual">
            <div className="lp-mock-line"><span>Assets (stock + receivables)</span><span className="lp-mono">₦1,626,000</span></div>
            <div className="lp-mock-line"><span>Liabilities</span><span className="lp-mono">₦0</span></div>
            <div className="lp-mock-line"><span>Risk level</span><span className="lp-mock-tag">Low</span></div>
          </div>
        </div>
      </section>

      <section className="lp-platforms" id="platforms">
        <div className="lp-platforms-inner">
          <h2>One ledger, wherever you run your shop.</h2>
          <div className="lp-platform-grid">
            <div className="lp-platform-card">
              <h4>Web</h4>
              <p>Manage everything from a browser — on the shop PC, or your phone, from anywhere.</p>
            </div>
            <div className="lp-platform-card">
              <h4>Desktop (works offline)</h4>
              <p>A point-of-sale app that keeps ringing up sales even when the internet drops, then syncs once you're back online.</p>
            </div>
            <div className="lp-platform-card">
              <h4>Android</h4>
              <p>The full app in your pocket, with receipts printing straight to your Bluetooth printer.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-steps" id="how-it-works">
        <h2>Set up in three steps</h2>
        <div className="lp-steps-grid">
          <div>
            <div className="lp-step-num">1</div>
            <h4>Create your shop</h4>
            <p>Give your shop a name and set your owner login — no card required to start.</p>
          </div>
          <div>
            <div className="lp-step-num">2</div>
            <h4>Add your stock</h4>
            <p>Bring in your products as batches, with cost, selling price, and expiry if it applies.</p>
          </div>
          <div>
            <div className="lp-step-num">3</div>
            <h4>Start selling</h4>
            <p>Ring up sales, log service jobs, and watch your dashboard update in real time.</p>
          </div>
        </div>
      </section>

      <section className="lp-pricing" id="pricing">
        <div className="lp-pricing-inner">
          <h2>Simple pricing, no surprises.</h2>
          <p>Covers cloud sync, backup, and the CEO app. Selling on the till never depends on this being paid.</p>
          <div className="lp-pricing-grid">
            <div className="lp-price-card">
              <div className="lp-price-label">Monthly</div>
              <div className="lp-price-amount">₦7,000<span>/month</span></div>
              <p>Pay as you go, cancel anytime.</p>
            </div>
            <div className="lp-price-card lp-price-featured">
              <div className="lp-price-badge">Save 29%</div>
              <div className="lp-price-label">Yearly</div>
              <div className="lp-price-amount">₦60,000<span>/year</span></div>
              <p>Same everything, for less than 9 months' worth.</p>
            </div>
          </div>
          <div className="lp-pricing-trial">
            <Link to="/signup" className="lp-btn lp-btn-signal lp-btn-wide">Try free for 1 month</Link>
            <p>No card needed to start — decide once you've actually used it.</p>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-credit">Gavin's Software Solutions (GSS)</div>
        <div className="lp-footer-links">
          <Link to="/about">About</Link>
          <Link to="/guide">Guide</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Get started</Link>
          <a href="mailto:ogbejoshua42@gmail.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
