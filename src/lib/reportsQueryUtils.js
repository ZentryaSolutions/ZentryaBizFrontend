/** Calendar YYYY-MM-DD in the user's local timezone (avoid UTC shift from toISOString). */
export function formatLocalYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Same default range as Reports "Monthly" preset — used for shop bootstrap prefetch + initial dates. */
export function defaultMonthlyReportParams() {
  const today = new Date();
  const start_date = formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1));
  const end_date = formatLocalYmd(today);
  return { period: 'monthly', start_date, end_date };
}

/**
 * Date bounds for Reports period chips (single source for UI + API).
 * - weekly: last 7 calendar days inclusive (today and the prior 6 days), not Sun–today only,
 *   so expenses earlier in the month still appear when "Monthly" includes them.
 */
export function computePresetDateRange(filterType, customStartDate = '', customEndDate = '') {
  const today = new Date();

  if (filterType === 'custom') {
    return {
      start: customStartDate || formatLocalYmd(today),
      end: customEndDate || formatLocalYmd(today),
    };
  }

  switch (filterType) {
    case 'today':
    case 'daily':
      return { start: formatLocalYmd(today), end: formatLocalYmd(today) };
    case 'weekly': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      return { start: formatLocalYmd(weekStart), end: formatLocalYmd(today) };
    }
    case 'monthly':
      return {
        start: formatLocalYmd(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: formatLocalYmd(today),
      };
    case 'last3months': {
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      return { start: formatLocalYmd(threeMonthsAgo), end: formatLocalYmd(today) };
    }
    case 'last6months': {
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(today.getMonth() - 6);
      return { start: formatLocalYmd(sixMonthsAgo), end: formatLocalYmd(today) };
    }
    case 'thisyear':
      return {
        start: formatLocalYmd(new Date(today.getFullYear(), 0, 1)),
        end: formatLocalYmd(today),
      };
    case 'lastyear': {
      const lastYear = today.getFullYear() - 1;
      return {
        start: formatLocalYmd(new Date(lastYear, 0, 1)),
        end: formatLocalYmd(new Date(lastYear, 11, 31)),
      };
    }
    default:
      return { start: formatLocalYmd(today), end: formatLocalYmd(today) };
  }
}
