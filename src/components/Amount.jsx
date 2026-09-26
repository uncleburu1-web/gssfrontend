import { useState } from 'react';
import { money } from '../utils/format';

// Wraps any money() value that renders inside a truncating class (like
// .stat-value, which clips with an ellipsis when the figure is too wide
// for the card). Double-clicking pops the full, untruncated amount into
// a small modal instead of guessing at a wider layout everywhere it's used.
export default function Amount({ value, className, style }) {
  const [open, setOpen] = useState(false);
  const formatted = money(value);

  return (
    <>
      <div
        className={className}
        style={{ cursor: 'pointer', ...style }}
        onDoubleClick={() => setOpen(true)}
        title="Double-click to see the full amount"
      >
        {formatted}
      </div>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div
            className="modal"
            style={{ maxWidth: 300, textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="mono"
              style={{ fontSize: 26, fontWeight: 700, wordBreak: 'break-all', lineHeight: 1.3 }}
            >
              {formatted}
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center' }}>
              <button className="btn small" onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
