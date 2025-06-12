import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const CST_TIMEZONE = 'America/Chicago';

/**
 * Format a date/time string or Date object to CST AM/PM format
 */
export function formatTimeToCST(time: string | Date): string {
  try {
    const date = typeof time === 'string' ? parseISO(time) : time;
    return formatInTimeZone(date, CST_TIMEZONE, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time to CST:', error);
    return typeof time === 'string' ? time : format(time, 'h:mm a');
  }
}

/**
 * Format a date to CST timezone with full date and time
 */
export function formatDateTimeToCST(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, CST_TIMEZONE, 'MMM d, yyyy h:mm a');
  } catch (error) {
    console.error('Error formatting datetime to CST:', error);
    return typeof date === 'string' ? date : format(date, 'MMM d, yyyy h:mm a');
  }
}

/**
 * Convert 24-hour time string (HH:mm) to 12-hour CST format
 */
export function formatTimeStringToCST(timeString: string): string {
  try {
    // Create a date object with today's date and the specified time
    const today = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
    return formatInTimeZone(date, CST_TIMEZONE, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time string to CST:', error);
    return timeString;
  }
}

/**
 * Get current time in CST
 */
export function getCurrentTimeCST(): string {
  return formatInTimeZone(new Date(), CST_TIMEZONE, 'h:mm a');
}

/**
 * Get current date and time in CST
 */
export function getCurrentDateTimeCST(): string {
  return formatInTimeZone(new Date(), CST_TIMEZONE, 'MMM d, yyyy h:mm a');
}