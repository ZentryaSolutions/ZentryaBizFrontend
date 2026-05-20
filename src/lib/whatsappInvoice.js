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

/**
 * @param {{ invoice_number?: string, date?: string, customer_name?: string, items?: Array<{ product_name?: string, name?: string, quantity?: number, selling_price?: number }>, subtotal?: number, discount?: number, tax?: number, total_amount?: number, paid_amount?: number, shopName?: string }} sale
 * @param {{ phone?: string, customerPhone?: string }} opts
 */
export function buildInvoiceWhatsAppText(sale, opts = {}) {
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

export function openWhatsAppInvoice(sale, phoneRaw) {
  const phone = digitsOnly(phoneRaw);
  if (!phone || phone.length < 10) {
    return { ok: false, error: 'Customer phone number is required for WhatsApp.' };
  }
  const text = buildInvoiceWhatsAppText(sale);
  const intl = phone.startsWith('92') ? phone : phone.startsWith('0') ? `92${phone.slice(1)}` : `92${phone}`;
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return { ok: true };
}
