// src/lib/utils/date.ts

export function formatShortDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', { 
    day: 'numeric', 
    month: 'short' 
  });
}

export function getMonthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}