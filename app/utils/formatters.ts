/**
 * Formatting Utilities
 *
 * Provides utility functions for formatting dates, numbers, currency, and text.
 * Uses Intl APIs for locale-aware formatting.
 */

/**
 * Format a date using a specified format
 *
 * @param date - The date to format
 * @param format - Format style ('short', 'medium', 'long', 'full')
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDate(new Date(), 'medium') // "Jan 18, 2025"
 * formatDate(new Date(), 'long') // "January 18, 2025"
 * ```
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium',
  locale: string = 'en-US'
): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, { dateStyle: format }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a date and time using a specified format
 *
 * @param date - The date to format
 * @param dateFormat - Date format style
 * @param timeFormat - Time format style
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date and time string
 *
 * @example
 * ```ts
 * formatDateTime(new Date()) // "Jan 18, 2025, 2:30 PM"
 * ```
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  dateFormat: 'short' | 'medium' | 'long' | 'full' = 'medium',
  timeFormat: 'short' | 'medium' | 'long' | 'full' = 'short',
  locale: string = 'en-US'
): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(locale, {
      dateStyle: dateFormat,
      timeStyle: timeFormat
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '';
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 *
 * @param date - The date to format
 * @param locale - Locale string (default: 'en-US')
 * @returns Relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 * formatRelativeTime(new Date(Date.now() - 86400000 * 3)) // "3 days ago"
 * ```
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  locale: string = 'en-US'
): string {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffInSeconds < 60) {
      return rtf.format(-diffInSeconds, 'second');
    } else if (diffInSeconds < 3600) {
      return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
    } else if (diffInSeconds < 86400) {
      return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
    } else if (diffInSeconds < 2592000) {
      return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
    } else if (diffInSeconds < 31536000) {
      return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
    } else {
      return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
}

/**
 * Format a number as currency
 *
 * @param amount - The amount to format
 * @param currency - Currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted currency string
 *
 * @example
 * ```ts
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 * ```
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return '';
  }
}

/**
 * Format a number with commas (thousands separator)
 *
 * @param num - The number to format
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted number string
 *
 * @example
 * ```ts
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234.5678, 'en-US') // "1,234.568"
 * ```
 */
export function formatNumber(
  num: number | null | undefined,
  locale: string = 'en-US'
): string {
  if (num === null || num === undefined || isNaN(num)) return '';

  try {
    return new Intl.NumberFormat(locale).format(num);
  } catch (error) {
    console.error('Error formatting number:', error);
    return '';
  }
}

/**
 * Format a number as a percentage
 *
 * @param value - The value to format (0-100 or 0-1)
 * @param decimals - Number of decimal places (default: 0)
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted percentage string
 *
 * @example
 * ```ts
 * formatPercentage(95) // "95%"
 * formatPercentage(95.5, 1) // "95.5%"
 * formatPercentage(0.955, 1) // "95.5%" (if value is 0-1, it's multiplied by 100)
 * ```
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals: number = 0,
  locale: string = 'en-US'
): string {
  if (value === null || value === undefined || isNaN(value)) return '';

  try {
    // If value is between 0 and 1, assume it's a decimal (e.g., 0.95 = 95%)
    const percentValue = value < 1 ? value * 100 : value;

    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(percentValue / 100);
  } catch (error) {
    console.error('Error formatting percentage:', error);
    return '';
  }
}

/**
 * Truncate text to a maximum length and add ellipsis
 *
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated text
 *
 * @example
 * ```ts
 * truncateText('This is a very long text', 10) // "This is a..."
 * truncateText('Short', 10) // "Short"
 * ```
 */
export function truncateText(
  text: string | null | undefined,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Format file size in human-readable format
 *
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted file size
 *
 * @example
 * ```ts
 * formatFileSize(1024) // "1 KB"
 * formatFileSize(1536) // "1.5 KB"
 * formatFileSize(1048576) // "1 MB"
 * ```
 */
export function formatFileSize(bytes: number | null | undefined, decimals: number = 2): string {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Pluralize a word based on count
 *
 * @param count - The count to check
 * @param singular - Singular form of the word
 * @param plural - Plural form of the word (optional, defaults to singular + 's')
 * @returns Pluralized word
 *
 * @example
 * ```ts
 * pluralize(1, 'item') // "1 item"
 * pluralize(5, 'item') // "5 items"
 * pluralize(1, 'query', 'queries') // "1 query"
 * pluralize(5, 'query', 'queries') // "5 queries"
 * ```
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  const word = count === 1 ? singular : (plural || singular + 's');
  return `${count} ${word}`;
}
