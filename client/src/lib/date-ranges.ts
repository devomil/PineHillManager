import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, format } from 'date-fns';

export type DateRangeOption = {
  label: string;
  value: string;
  startDate: Date;
  endDate: Date;
};

export const getDateRangeOptions = (): DateRangeOption[] => {
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  return [
    {
      label: 'Today',
      value: 'today',
      startDate: startOfDay(today),
      endDate: endOfDay(today)
    },
    {
      label: 'Yesterday',
      value: 'yesterday',
      startDate: startOfDay(yesterday),
      endDate: endOfDay(yesterday)
    },
    {
      label: 'This Week',
      value: 'this-week',
      startDate: startOfWeek(today, { weekStartsOn: 1 }), // Monday start
      endDate: endOfWeek(today, { weekStartsOn: 1 })
    },
    {
      label: 'Last Week',
      value: 'last-week',
      startDate: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }),
      endDate: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
    },
    {
      label: 'Last 7 Days',
      value: 'last-7-days',
      startDate: startOfDay(subDays(today, 6)),
      endDate: endOfDay(today)
    },
    {
      label: 'This Month',
      value: 'this-month',
      startDate: startOfMonth(today),
      endDate: endOfMonth(today)
    },
    {
      label: 'Last Month',
      value: 'last-month',
      startDate: startOfMonth(subMonths(today, 1)),
      endDate: endOfMonth(subMonths(today, 1))
    },
    {
      label: 'Last 30 Days',
      value: 'last-30-days',
      startDate: startOfDay(subDays(today, 29)),
      endDate: endOfDay(today)
    },
    {
      label: 'Last 3 Months',
      value: 'last-3-months',
      startDate: startOfMonth(subMonths(today, 2)),
      endDate: endOfMonth(today)
    },
    {
      label: 'Last 6 Months',
      value: 'last-6-months',
      startDate: startOfMonth(subMonths(today, 5)),
      endDate: endOfMonth(today)
    },
    {
      label: 'This Year',
      value: 'this-year',
      startDate: startOfYear(today),
      endDate: endOfYear(today)
    },
    {
      label: 'Last Year',
      value: 'last-year',
      startDate: startOfYear(subYears(today, 1)),
      endDate: endOfYear(subYears(today, 1))
    },
    {
      label: 'Last 12 Months',
      value: 'last-12-months',
      startDate: startOfMonth(subMonths(today, 11)),
      endDate: endOfMonth(today)
    }
  ];
};

export const formatDateForAPI = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
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