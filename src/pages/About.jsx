import { Link } from 'react-router-dom';
import '../marketing.css';

export default function About() {
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

      <section className="about-hero">
        <span className="lp-feature-tag">About GSS</span>
        <h1>Built for the shop, not for a demo.</h1>
        <p>
          GSS (Gavin's Software Solutions) is shop-management software for people who
          actually stand behind a counter — gadget repairers, pharmacies, boutiques, and
          general stores who were tracking stock, sales, and debts in a notebook, and
          needed something that wouldn't lose a page.
        </p>
      </section>

      <div className="about-body">
        <div className="about-block">
          <h2>Why we built it</h2>
          <p>
            Every shop we spoke to already had a system — it just lived in a notebook, a
            memory, or a stack of receipts. That system worked, until a page tore, a
            worker forgot to write something down, or the owner needed to know what the
            shop was actually worth and had no way to add it up. GSS replaces the
            notebook, not the shopkeeper's judgment — it just makes sure nothing gets lost.
          </p>
        </div>
        <div className="about-block">
          <h2>What it actually does</h2>
          <p>
            One place for stock (tracked in batches, with cost and expiry), sales (cash,
            card, or installment), repair jobs, staff activity, and what the shop owes or
            is owed — updated the moment anything happens, and the same picture whether
            you're on the counter PC, a phone, or checking in from home.
          </p>
        </div>
        <div className="about-block">
          <h2>Who it's for</h2>
          <p>
            Shop owners who want to know their real numbers, not just today's till. Built
            specifically around four kinds of shops — gadgets &amp; electronics, pharmacy
            &amp; health, clothing &amp; fashion, and general retail — so what you see is
            relevant to what you actually sell, not a generic inventory form.
          </p>
        </div>
        <div className="about-block">
          <h2>How it stays working offline</h2>
          <p>
            The desktop till keeps ringing up sales even when the internet drops, then
            syncs everything once you're back online — a bad connection is never a reason
            to stop selling.
          </p>
        </div>
      </div>

      <div className="about-stats">
        <div className="about-stat">
          <div className="about-stat-n">3</div>
          <div className="about-stat-l">platforms — web, desktop, Android</div>
        </div>
        <div className="about-stat">
          <div className="about-stat-n">4</div>
          <div className="about-stat-l">shop types supported natively</div>
        </div>
        <div className="about-stat">
          <div className="about-stat-n">0</div>
          <div className="about-stat-l">sales lost when the internet drops</div>
        </div>
      </div>

      <div className="about-credit">
        <div className="about-credit-inner">
          <h2>Made by Gavin's Software Solutions</h2>
          <p>Software built and supported directly by the people who make it — reach us any time at ogbejoshua42@gmail.com.</p>
        </div>
      </div>

      <footer className="lp-footer">
        <div className="lp-footer-credit">Gavin's Software Solutions (GSS)</div>
        <div className="lp-footer-links">
          <Link to="/guide">Guide</Link>
          <Link to="/login">Log in</Link>
          <Link to="/signup">Get started</Link>
          <a href="mailto:ogbejoshua42@gmail.com">Contact</a>
        </div>
      </footer>
    </div>
  );
}
