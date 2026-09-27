/**
 * Asia/Jakarta (WIB - UTC+7) Standard Date & Time Utilities
 * Ensures that Preview (Google Cloud container) and Live (User devices)
 * display the exact same timestamps and calculate financial reports identically!
 */

export const WIB_TIMEZONE = "Asia/Jakarta";

export function formatWIBDateTime(dateInput: any): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleString("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatWIBDate(dateInput: any): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatWIBTime(dateInput: any): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", {
    timeZone: WIB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Returns YYYY-MM-DD in Asia/Jakarta timezone
 */
export function getWIBDateKey(dateInput: any): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: WIB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Returns YYYY-MM in Asia/Jakarta timezone
 */
export function getWIBMonthKey(dateInput: any): string {
  const key = getWIBDateKey(dateInput);
  return key ? key.slice(0, 7) : "";
}

/**
 * Returns today's date key in Asia/Jakarta (YYYY-MM-DD)
 */
export function getWIBTodayKey(): string {
  return getWIBDateKey(new Date());
}

/**
 * Returns current month key in Asia/Jakarta (YYYY-MM)
 */
export function getWIBCurrentMonthKey(): string {
  return getWIBMonthKey(new Date());
}
