/**
 * Open WhatsApp with a plain-text invoice (Option A — no API cost).
 */

function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function formatMoney(n) {
  const v = Number(n) || 0;
  return `PKR ${v.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

/** Pakistan mobile → wa.me digits (no +). */
export function normalizePakPhone(digits) {
  const d = digitsOnly(digits);
  if (!d) return '';
  if (d.startsWith('92') && d.length >= 12) return d;
  if (d.startsWith('0') && d.length >= 11) return `92${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('3')) return `92${d}`;
  if (d.length >= 10 && !d.startsWith('92')) return `92${d}`;
  return d;
}

/** Prefer <a> click (works with form submit); fallback to window.open. */
export function tryOpenExternalUrl(url) {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    /* continue */
  }
  try {
    const w = window.open(url, '_blank');
    return w != null;
  } catch {
    return false;
  }
}

/**
 * @param {{ invoice_number?: string, date?: string, customer_name?: string, items?: Array<{ product_name?: string, name?: string, quantity?: number, selling_price?: number }>, subtotal?: number, discount?: number, tax?: number, total_amount?: number, paid_amount?: number, shopName?: string }} sale
 */
export function buildInvoiceWhatsAppText(sale) {
  const shop = sale.shopName || 'Zentrya Biz';
  const lines = [
    `*${shop}*`,
    `Invoice: ${sale.invoice_number || '—'}`,
    `Date: ${sale.date ? String(sale.date).slice(0, 10) : '—'}`,
    `Customer: ${sale.customer_name || 'Cash Customer'}`,
    '',
    '*Items*',
  ];

  (sale.items || []).forEach((item, i) => {
    const name = item.product_name || item.name || `Item ${i + 1}`;
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.selling_price) || 0;
    lines.push(`• ${name} × ${qty} @ ${formatMoney(rate)} = ${formatMoney(qty * rate)}`);
  });

  if (!(sale.items || []).length) {
    lines.push('• (Open invoice in app for line items)');
  }

  lines.push('');
  if (Number(sale.discount) > 0) lines.push(`Discount: -${formatMoney(sale.discount)}`);
  if (Number(sale.tax) > 0) lines.push(`Tax: +${formatMoney(sale.tax)}`);
  lines.push(`*Total: ${formatMoney(sale.total_amount)}*`);
  lines.push(`Paid: ${formatMoney(sale.paid_amount)}`);
  const due = (Number(sale.total_amount) || 0) - (Number(sale.paid_amount) || 0);
  if (due > 0.01) lines.push(`Due: ${formatMoney(due)}`);
  lines.push('', 'Thank you for your business.');

  return lines.join('\n');
}

/**
 * @returns {{ ok: boolean, error?: string, url?: string }}
 */
export function openWhatsAppInvoice(sale, phoneRaw) {
  const phone = digitsOnly(phoneRaw);
  if (!phone || phone.length < 10) {
    return { ok: false, error: 'Enter a valid mobile number (e.g. 03001234567).' };
  }
  const intl = normalizePakPhone(phone);
  if (!intl || intl.length < 12) {
    return { ok: false, error: 'Enter a valid Pakistani mobile number (e.g. 03001234567).' };
  }
  const text = buildInvoiceWhatsAppText(sale);
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
  const opened = tryOpenExternalUrl(url);
  if (!opened) {
    return {
      ok: false,
      error: 'Browser blocked the popup. Tap the link below to open WhatsApp.',
      url,
    };
  }
  return { ok: true, url };
}
