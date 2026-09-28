export function money(n) {
  return '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function firstErrorMessage(data) {
  if (data == null) return null;
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    for (const entry of data) {
      const msg = firstErrorMessage(entry);
      if (msg) return msg;
    }
    return null;
  }
  if (typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) return data.non_field_errors[0];
    // Walks into nested field errors too — e.g. a sale's `items` field is a
    // LIST of per-line error objects (empty for lines that passed, populated
    // for the one that failed a stock check), which a shallow "just look at
    // the first key" read would either miss entirely or print as
    // "items: [object Object]" instead of the actual message underneath.
    for (const key of Object.keys(data)) {
      const msg = firstErrorMessage(data[key]);
      if (msg) return msg;
    }
    return null;
  }
  return null;
}

export function apiErrorMessage(err, fallback) {
  return firstErrorMessage(err?.response?.data) || fallback;
}

export function fmtDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return (
    dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
    ' ' +
    dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}
