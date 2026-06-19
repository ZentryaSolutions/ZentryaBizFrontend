export function parseInvoiceSeq(invoiceNo) {
  const raw = String(invoiceNo || '').trim();
  const inv = raw.match(/^INV-(\d{4})-(\d+)$/i);
  if (inv) {
    return {
      year: parseInt(inv[1], 10),
      seq: parseInt(inv[2], 10),
    };
  }
  const bill = raw.match(/^Bill-(\d+)$/i);
  if (bill) {
    return {
      year: new Date().getFullYear(),
      seq: parseInt(bill[1], 10),
    };
  }
  return null;
}

export function formatInvoiceNumber(year, seq) {
  return `INV-${year}-${String(seq).padStart(4, '0')}`;
}

function collectUsedSeqs(bills, { year, skipBillId } = {}) {
  const used = new Set();
  for (const bill of bills || []) {
    if (skipBillId && bill.id === skipBillId) continue;
    const raw = bill.invoiceNumber || bill.pendingInvoiceNumber;
    const parsed = parseInvoiceSeq(raw);
    if (!parsed || !Number.isFinite(parsed.seq)) continue;
    if (year != null && parsed.year !== year) continue;
    used.add(parsed.seq);
  }
  return used;
}

/** Next preview number for one tab, skipping numbers held by other open drafts. */
export function allocateNextInvoice(serverInvoice, bills, forBillId) {
  const base = parseInvoiceSeq(serverInvoice);
  const year = base?.year ?? new Date().getFullYear();
  let cursor = base?.seq ?? 1;
  const used = collectUsedSeqs(bills, { year, skipBillId: forBillId });
  while (used.has(cursor)) cursor += 1;
  return formatInvoiceNumber(year, cursor);
}

/** Assign unique preview numbers to every empty draft tab (login / session refresh). */
export function assignDraftInvoiceNumbers(bills, serverInvoice) {
  const base = parseInvoiceSeq(serverInvoice);
  const year = base?.year ?? new Date().getFullYear();
  let cursor = base?.seq ?? 1;
  const used = new Set();

  const reserve = (invoiceNo) => {
    const parsed = parseInvoiceSeq(invoiceNo);
    if (parsed && parsed.year === year && Number.isFinite(parsed.seq)) {
      used.add(parsed.seq);
    }
  };

  for (const bill of bills || []) {
    if (bill.invoiceNumber) reserve(bill.invoiceNumber);
    else if ((bill.invoiceItems || []).length > 0 && bill.pendingInvoiceNumber) {
      reserve(bill.pendingInvoiceNumber);
    }
  }

  return (bills || []).map((bill) => {
    if (bill.invoiceNumber) return bill;
    if ((bill.invoiceItems || []).length > 0) {
      if (bill.pendingInvoiceNumber) reserve(bill.pendingInvoiceNumber);
      return bill;
    }

    const existing = parseInvoiceSeq(bill.pendingInvoiceNumber);
    if (existing && existing.year === year && !used.has(existing.seq)) {
      used.add(existing.seq);
      return bill;
    }

    while (used.has(cursor)) cursor += 1;
    const num = formatInvoiceNumber(year, cursor);
    used.add(cursor);
    cursor += 1;
    return {
      ...bill,
      pendingInvoiceNumber: num,
      invoiceNumber: '',
    };
  });
}
