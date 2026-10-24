// Display helpers. Times always use the location's time zone, never the browser's.

export function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" });
}

/** 95 -> "1h 35m", 12 -> "12m", 3000 -> "2d 2h" */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
