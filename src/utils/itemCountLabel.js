export function sumItemQuantities(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  return items.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
}

export function formatItemCountLabel(count, t) {
  const n = Number(count);
  if (count == null || count === '' || Number.isNaN(n)) return null;
  const value = Math.round(n);
  if (value === 1) {
    return t('sales.oneItem', { defaultValue: '1 item' });
  }
  return t('sales.itemsCount', {
    count: value,
    defaultValue: `${value} items`,
  });
}
