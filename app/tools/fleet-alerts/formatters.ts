import { AlertDetail, AlertCategory } from "./parser";

interface ParsedSpeed {
  actual: number;
  limit: number;
}

interface AlertBlock {
  alerts: AlertDetail[];
  startDate: Date | null;
  endDate: Date | null;
  maxSpeed: ParsedSpeed | null;
}

// Parses "05/12/2026 07:00 AM" → Date
function parseAlertDate(s: string): Date | null {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[4]);
  const min = parseInt(m[5]);
  const ampm = m[6].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]), h, min);
}

// Parses "traveling 72 mph in a 55 mph" → { actual: 72, limit: 55 }
function parseSpeed(description: string): ParsedSpeed | null {
  const m = description.match(/(\d+)\s*mph\D+?(\d+)\s*mph/i);
  if (!m) return null;
  return { actual: parseInt(m[1]), limit: parseInt(m[2]) };
}

function formatTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatShortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

// Groups alerts where the gap between consecutive alerts is ≤ gapMinutes
function groupAlerts(details: AlertDetail[], gapMinutes = 30): AlertBlock[] {
  if (details.length === 0) return [];

  const items = details
    .map((d) => ({ detail: d, date: parseAlertDate(d.date) }))
    .sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.getTime() - b.date.getTime();
    });

  const blocks: AlertBlock[] = [];
  let current = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1];
    const curr = items[i];
    const gapMs =
      prev.date && curr.date ? curr.date.getTime() - prev.date.getTime() : Infinity;
    if (gapMs / 60000 <= gapMinutes) {
      current.push(curr);
    } else {
      blocks.push(buildBlock(current));
      current = [curr];
    }
  }
  blocks.push(buildBlock(current));
  return blocks;
}

function buildBlock(items: { detail: AlertDetail; date: Date | null }[]): AlertBlock {
  const dates = items.map((i) => i.date).filter(Boolean) as Date[];
  const speeds = items
    .map((i) => parseSpeed(i.detail.description))
    .filter(Boolean) as ParsedSpeed[];
  const maxSpeed =
    speeds.length > 0 ? speeds.reduce((best, s) => (s.actual > best.actual ? s : best)) : null;

  return {
    alerts: items.map((i) => i.detail),
    startDate: dates[0] ?? null,
    endDate: dates[dates.length - 1] ?? null,
    maxSpeed,
  };
}

function formatBlock(block: AlertBlock, category: AlertCategory): string {
  const { alerts, startDate, endDate, maxSpeed } = block;
  const n = alerts.length;
  const typeLabel = category === "speeding" ? "speeding" : "braking";

  if (!startDate) return `• ${n} ${typeLabel} alert${n !== 1 ? "s" : ""}`;

  const dateStr = formatShortDate(startDate);

  if (n === 1) {
    const speed = maxSpeed ? ` — ${maxSpeed.actual} in a ${maxSpeed.limit}` : "";
    return `• ${dateStr} ${formatTime(startDate)}${speed}`;
  }

  const timeRange = endDate
    ? `${formatTime(startDate)} to ${formatTime(endDate)}`
    : formatTime(startDate);

  let line = `• ${dateStr} — ${n} ${typeLabel} alerts from ${timeRange}`;
  if (maxSpeed) line += ` — as high as ${maxSpeed.actual} in a ${maxSpeed.limit}`;
  return line;
}

export function formatEmailText(
  vehicle: string,
  category: AlertCategory,
  details: AlertDetail[]
): string {
  const label = category === "speeding" ? "Speeding" : "Harsh Braking";
  const blocks = groupAlerts(details);

  return [
    `${label} alerts — ${vehicle}`,
    "",
    ...blocks.map((b) => formatBlock(b, category)),
    "",
    `Total: ${details.length} alert${details.length !== 1 ? "s" : ""}`,
  ].join("\n");
}
