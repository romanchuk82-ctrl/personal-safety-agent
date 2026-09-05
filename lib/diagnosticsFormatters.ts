/**
 * Personal Safety Agent - Diagnostics & Source Timestamps Formatters
 */

export function formatTimeHHMMSS(dateOrTs: number | Date | string | null | undefined): string {
  if (!dateOrTs) return '—';
  const d = typeof dateOrTs === 'string' || typeof dateOrTs === 'number' ? new Date(dateOrTs) : dateOrTs;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export function formatAgeWithStaleWarningUk(
  ageSec: number | null | undefined,
  staleThresholdSec: number = 90
): { text: string; isStale: boolean; rawSec: number } {
  if (ageSec === null || ageSec === undefined || isNaN(ageSec) || ageSec < 0) {
    return { text: 'Очікування…', isStale: false, rawSec: 0 };
  }

  const isStale = ageSec > staleThresholdSec;
  const mins = Math.floor(ageSec / 60);
  const secs = ageSec % 60;

  if (isStale) {
    const duration = mins > 0 ? `${mins} хв ${secs} с` : `${secs} с`;
    return {
      text: `⚠️ ДАНІ ЗАСТАРІЛИ — ${duration}`,
      isStale: true,
      rawSec: ageSec
    };
  }

  if (ageSec < 60) {
    return {
      text: `${ageSec} с тому`,
      isStale: false,
      rawSec: ageSec
    };
  }

  if (secs === 0) {
    return {
      text: `${mins} хв тому`,
      isStale: false,
      rawSec: ageSec
    };
  }

  return {
    text: `${mins} хв ${secs} с тому`,
    isStale: false,
    rawSec: ageSec
  };
}
