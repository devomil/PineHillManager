import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

// Business timezone for Pine Hill Farm (Central Time)
const BUSINESS_TIMEZONE = 'America/Chicago';

export type DateRangeOption = {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
  // Epoch milliseconds for direct API use (timezone-aware)
  startEpoch: number;
  endEpoch: number;
};

// Helper function to create timezone-aware date boundaries
const createTzAwareBoundary = (date: Date, boundaryFn: (date: Date) => Date): { localDate: Date; epochMs: number } => {
  // Convert the date to business timezone
  const zonedDate = toZonedTime(date, BUSINESS_TIMEZONE);
  // Apply the boundary function (startOfDay, endOfDay, etc.)
  const boundaryInTz = boundaryFn(zonedDate);
  // Convert back to UTC for epoch calculation
  const utcBoundary = fromZonedTime(boundaryInTz, BUSINESS_TIMEZONE);
  
  return {
    localDate: utcBoundary,
    epochMs: utcBoundary.getTime()
  };
};

export const getDateRangeOptions = (): DateRangeOption[] => {
  const now = new Date();
  const yesterday = subDays(now, 1);
  
  // Calculate timezone-aware boundaries
  const todayStart = createTzAwareBoundary(now, startOfDay);
  const todayEnd = createTzAwareBoundary(now, endOfDay);
  const yesterdayStart = createTzAwareBoundary(yesterday, startOfDay);
  const yesterdayEnd = createTzAwareBoundary(yesterday, endOfDay);
  
  return [
    {
      label: 'Today',
      value: 'today',
      startDate: todayStart.localDate,
      endDate: todayEnd.localDate,
      startEpoch: todayStart.epochMs,
      endEpoch: todayEnd.epochMs
    },
    {
      label: 'Yesterday',
      value: 'yesterday',
      startDate: yesterdayStart.localDate,
      endDate: yesterdayEnd.localDate,
      startEpoch: yesterdayStart.epochMs,
      endEpoch: yesterdayEnd.epochMs
    },
    {
      label: 'This Week',
      value: 'this-week',
      ...(() => {
        const thisWeekStart = createTzAwareBoundary(now, (d) => startOfWeek(d, { weekStartsOn: 1 }));
        const thisWeekEnd = createTzAwareBoundary(now, (d) => endOfWeek(d, { weekStartsOn: 1 }));
        return {
          startDate: thisWeekStart.localDate,
          endDate: thisWeekEnd.localDate,
          startEpoch: thisWeekStart.epochMs,
          endEpoch: thisWeekEnd.epochMs
        };
      })()
    },
    {
      label: 'Last Week',
      value: 'last-week',
      ...(() => {
        const lastWeekStart = createTzAwareBoundary(subWeeks(now, 1), (d) => startOfWeek(d, { weekStartsOn: 1 }));
        const lastWeekEnd = createTzAwareBoundary(subWeeks(now, 1), (d) => endOfWeek(d, { weekStartsOn: 1 }));
        return {
          startDate: lastWeekStart.localDate,
          endDate: lastWeekEnd.localDate,
          startEpoch: lastWeekStart.epochMs,
          endEpoch: lastWeekEnd.epochMs
        };
      })()
    },
    {
      label: 'Last 7 Days',
      value: 'last-7-days',
      ...(() => {
        const last7Start = createTzAwareBoundary(subDays(now, 6), startOfDay);
        const last7End = createTzAwareBoundary(now, endOfDay);
        return {
          startDate: last7Start.localDate,
          endDate: last7End.localDate,
          startEpoch: last7Start.epochMs,
          endEpoch: last7End.epochMs
        };
      })()
    },
    {
      label: 'This Month',
      value: 'this-month',
      ...(() => {
        const thisMonthStart = createTzAwareBoundary(now, startOfMonth);
        const thisMonthEnd = createTzAwareBoundary(now, endOfMonth);
        return {
          startDate: thisMonthStart.localDate,
          endDate: thisMonthEnd.localDate,
          startEpoch: thisMonthStart.epochMs,
          endEpoch: thisMonthEnd.epochMs
        };
      })()
    },
    {
      label: 'Last Month',
      value: 'last-month',
      ...(() => {
        const lastMonthStart = createTzAwareBoundary(subMonths(now, 1), startOfMonth);
        const lastMonthEnd = createTzAwareBoundary(subMonths(now, 1), endOfMonth);
        return {
          startDate: lastMonthStart.localDate,
          endDate: lastMonthEnd.localDate,
          startEpoch: lastMonthStart.epochMs,
          endEpoch: lastMonthEnd.epochMs
        };
      })()
    },
    {
      label: 'Last 30 Days',
      value: 'last-30-days',
      ...(() => {
        const last30Start = createTzAwareBoundary(subDays(now, 29), startOfDay);
        const last30End = createTzAwareBoundary(now, endOfDay);
        return {
          startDate: last30Start.localDate,
          endDate: last30End.localDate,
          startEpoch: last30Start.epochMs,
          endEpoch: last30End.epochMs
        };
      })()
    },
    {
      label: 'Last 3 Months',
      value: 'last-3-months',
      ...(() => {
        const last3MonthsStart = createTzAwareBoundary(subMonths(now, 2), startOfMonth);
        const last3MonthsEnd = createTzAwareBoundary(now, endOfMonth);
        return {
          startDate: last3MonthsStart.localDate,
          endDate: last3MonthsEnd.localDate,
          startEpoch: last3MonthsStart.epochMs,
          endEpoch: last3MonthsEnd.epochMs
        };
      })()
    },
    {
      label: 'Last 6 Months',
      value: 'last-6-months',
      ...(() => {
        const last6MonthsStart = createTzAwareBoundary(subMonths(now, 5), startOfMonth);
        const last6MonthsEnd = createTzAwareBoundary(now, endOfMonth);
        return {
          startDate: last6MonthsStart.localDate,
          endDate: last6MonthsEnd.localDate,
          startEpoch: last6MonthsStart.epochMs,
          endEpoch: last6MonthsEnd.epochMs
        };
      })()
    },
    {
      label: 'This Year',
      value: 'this-year',
      ...(() => {
        const thisYearStart = createTzAwareBoundary(now, startOfYear);
        const thisYearEnd = createTzAwareBoundary(now, endOfYear);
        return {
          startDate: thisYearStart.localDate,
          endDate: thisYearEnd.localDate,
          startEpoch: thisYearStart.epochMs,
          endEpoch: thisYearEnd.epochMs
        };
      })()
    },
    {
      label: 'Last Year',
      value: 'last-year',
      ...(() => {
        const lastYearStart = createTzAwareBoundary(subYears(now, 1), startOfYear);
        const lastYearEnd = createTzAwareBoundary(subYears(now, 1), endOfYear);
        return {
          startDate: lastYearStart.localDate,
          endDate: lastYearEnd.localDate,
          startEpoch: lastYearStart.epochMs,
          endEpoch: lastYearEnd.epochMs
        };
      })()
    },
    {
      label: 'Last 12 Months',
      value: 'last-12-months',
      ...(() => {
        const last12MonthsStart = createTzAwareBoundary(subMonths(now, 11), startOfMonth);
        const last12MonthsEnd = createTzAwareBoundary(now, endOfMonth);
        return {
          startDate: last12MonthsStart.localDate,
          endDate: last12MonthsEnd.localDate,
          startEpoch: last12MonthsStart.epochMs,
          endEpoch: last12MonthsEnd.epochMs
        };
      })()
    }
  ];
};

// Legacy function for display purposes only
export const formatDateForAPI = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// New function to get epoch milliseconds for API calls
export const getEpochForAPI = (date: Date): number => {
  return date.getTime();
};

export const getDateRangeByValue = (value: string): DateRangeOption | null => {
  const options = getDateRangeOptions();
  return options.find(option => option.value === value) || null;
};

export const getDateRangeLabel = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
    return format(start, 'MMM d, yyyy');
  }
  
  if (format(start, 'yyyy') === format(end, 'yyyy')) {
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  }
  
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
};