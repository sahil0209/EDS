/**
 * Parses a date that can be either a timestamp number or date string
 * For timestamps, assumes the value represents an EST/EDT time incorrectly stored as UTC,
 * so we adjust by adding the EST/EDT offset to get the correct moment in time
 * For date strings, interprets them as dates in EST/EDT timezone
 * @param {number|string} date - Date to parse
 * @returns {Date|null} Parsed date object or null
 */
function parseDate(date) {
  if (!date) return null;

  // Handle timestamp numbers
  if (typeof date === 'number') {
    const parsed = new Date(date * 1000);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(parsed);
    const tzName = parts.find((part) => part.type === 'timeZoneName')?.value || 'EST';
    const hoursToAdd = tzName === 'EDT' ? 4 : 5;
    return new Date(parsed.getTime() + (hoursToAdd * 60 * 60 * 1000));
  }

  // Handle date strings
  // Parse month/day/year manually to avoid any timezone interpretation
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  // Extract the string components to parse manually
  const dateStr = date.toString();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  // Try to match "Month Day, Year" pattern
  let month = -1;
  let day = -1;
  let year = -1;

  monthNames.forEach((monthName, idx) => {
    if (dateStr.includes(monthName)) {
      month = idx;
    }
  });

  const dayMatch = dateStr.match(/\b(\d{1,2}),?\s+\d{4}/);
  const yearMatch = dateStr.match(/\b(\d{4})\b/);

  if (dayMatch) day = parseInt(dayMatch[1], 10);
  if (yearMatch) year = parseInt(yearMatch[1], 10);

  if (month !== -1 && day !== -1 && year !== -1) {
    // Create UTC date directly from components
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }

  // Fallback to original parsed date if pattern doesn't match
  return parsed;
}

/**
 * Formats a date to "Month Day, Year" format
 * Uses UTC for string-based dates to maintain consistency
 * @param {Date|number|string} date - Date object, timestamp, or date string to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  const parsedDate = date instanceof Date ? date : parseDate(date);
  if (!parsedDate) return '';

  // For dates created from strings (stored as UTC), use UTC formatting
  // For timestamp numbers, use America/New_York formatting
  const isFromTimestamp = typeof date === 'number';

  return parsedDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: isFromTimestamp ? 'America/New_York' : 'UTC',
  });
}

/**
 * Formats a date range with smart formatting
 * Uses UTC for string-based dates, EST/EDT for timestamps
 * @param {number|string} startDate - Start date (timestamp or string)
 * @param {number|string} endDate - End date (timestamp or string)
 * @returns {string} Formatted date range string
 */
function formatDateRange(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start?.getTime()) {
    return 'Date TBD';
  }

  if (end?.getTime() && end.getTime() !== start.getTime()) {
    const isFromTimestamp = typeof startDate === 'number';
    const timeZone = isFromTimestamp ? 'America/New_York' : 'UTC';

    // Format both dates
    const startFormatted = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    }).formatToParts(start);

    const endFormatted = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    }).formatToParts(end);

    const startMonth = startFormatted.find((p) => p.type === 'month')?.value;
    const startDay = startFormatted.find((p) => p.type === 'day')?.value;
    const startYear = startFormatted.find((p) => p.type === 'year')?.value;
    const endMonth = endFormatted.find((p) => p.type === 'month')?.value;
    const endDay = endFormatted.find((p) => p.type === 'day')?.value;
    const endYear = endFormatted.find((p) => p.type === 'year')?.value;

    const sameMonthYear = startMonth === endMonth && startYear === endYear;

    return sameMonthYear
      ? `${startMonth} ${startDay} - ${endDay}, ${startYear}`
      : `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  }

  return formatDate(start);
}

export {
  parseDate,
  formatDate,
  formatDateRange,
};
