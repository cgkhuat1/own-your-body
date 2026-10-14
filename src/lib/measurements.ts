import dayjs from 'dayjs';

export const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Ngực' },
  { key: 'waist', label: 'Eo' },
  { key: 'belly', label: 'Bụng' },
  { key: 'hips', label: 'Mông' },
  { key: 'thigh', label: 'Đùi' },
  { key: 'arm', label: 'Bắp tay' },
] as const;

export type MeasurementKey = typeof MEASUREMENT_FIELDS[number]['key'];

export interface MeasurementSet {
  chest?: number | string;
  waist?: number | string;
  belly?: number | string;
  hips?: number | string;
  thigh?: number | string;
  arm?: number | string;
  date?: string;
}

export type WeeklyMeasurements = Record<number, MeasurementSet>;

export function normalizeMeasurements(raw: any): WeeklyMeasurements {
  if (!raw) return {};
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object') return {};

  const result: WeeklyMeasurements = {};
  const keys = Object.keys(parsed);
  const hasNumericKeys = keys.some(k => !isNaN(parseInt(k)));

  if (hasNumericKeys) {
    keys.forEach(k => {
      const num = parseInt(k);
      if (!isNaN(num) && parsed[k] && typeof parsed[k] === 'object') {
        result[num] = parsed[k];
      }
    });
  } else {
    // Legacy single measurement format
    const hasAny = parsed.chest || parsed.waist || parsed.belly || parsed.hips || parsed.thigh || parsed.arm;
    if (hasAny) {
      result[1] = {
        chest: parsed.chest || '',
        waist: parsed.waist || '',
        belly: parsed.belly || '',
        hips: parsed.hips || '',
        thigh: parsed.thigh || '',
        arm: parsed.arm || '',
        date: parsed.date || ''
      };
    }
  }
  return result;
}

export function isWeekFilled(entry?: MeasurementSet): boolean {
  if (!entry) return false;
  return Boolean(
    (entry.chest && Number(entry.chest) > 0) ||
    (entry.waist && Number(entry.waist) > 0) ||
    (entry.belly && Number(entry.belly) > 0) ||
    (entry.hips && Number(entry.hips) > 0) ||
    (entry.thigh && Number(entry.thigh) > 0) ||
    (entry.arm && Number(entry.arm) > 0)
  );
}

export function checkNeedsMeasurement(
  measurementsRaw: any,
  coachingStartDate?: string,
  durationWeeks: number = 12
): { needsMeasurement: boolean; targetWeek: number } {
  if (!coachingStartDate) {
    return { needsMeasurement: false, targetWeek: 1 };
  }

  const measurements = normalizeMeasurements(measurementsRaw);
  const start = dayjs(coachingStartDate).startOf('day');
  const today = dayjs().startOf('day');
  const diffDays = today.diff(start, 'day');
  const realWeek = diffDays >= 0 ? Math.floor(diffDays / 7) + 1 : 1;

  if (realWeek > durationWeeks + 4) {
    return { needsMeasurement: false, targetWeek: 1 };
  }

  // Measurement weeks are odd numbers: 1, 3, 5, 7, 9, 11...
  if (realWeek % 2 === 1) {
    if (!isWeekFilled(measurements[realWeek])) {
      return { needsMeasurement: true, targetWeek: realWeek };
    }
    return { needsMeasurement: false, targetWeek: realWeek };
  } else {
    // Even week: check if previous odd week was missed
    const prevOdd = realWeek - 1;
    if (prevOdd >= 1 && !isWeekFilled(measurements[prevOdd])) {
      return { needsMeasurement: true, targetWeek: prevOdd };
    }
    return { needsMeasurement: false, targetWeek: prevOdd };
  }
}

export function getMeasurementSummary(measurementsRaw: any) {
  const measurements = normalizeMeasurements(measurementsRaw);
  const weeks = Object.keys(measurements)
    .map(Number)
    .filter(w => isWeekFilled(measurements[w]))
    .sort((a, b) => a - b);

  const baselineWeek = weeks.length > 0 ? weeks[0] : null;
  const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
  const prevWeek = weeks.length > 1 ? weeks[weeks.length - 2] : null;

  const rows = MEASUREMENT_FIELDS.map(f => {
    const key = f.key as keyof MeasurementSet;
    const baselineVal = baselineWeek !== null && measurements[baselineWeek]?.[key] ? Number(measurements[baselineWeek][key]) : null;
    const latestVal = latestWeek !== null && measurements[latestWeek]?.[key] ? Number(measurements[latestWeek][key]) : null;
    const prevVal = prevWeek !== null && measurements[prevWeek]?.[key] ? Number(measurements[prevWeek][key]) : null;

    const diffPrev = (latestVal !== null && prevVal !== null && prevWeek !== latestWeek)
      ? parseFloat((latestVal - prevVal).toFixed(1))
      : null;

    const diffBaseline = (latestVal !== null && baselineVal !== null && baselineWeek !== null)
      ? parseFloat((latestVal - baselineVal).toFixed(1))
      : null;

    return {
      field: f,
      baselineVal,
      latestVal,
      prevVal,
      diffPrev,
      diffBaseline
    };
  });

  return {
    weeks,
    baselineWeek,
    latestWeek,
    prevWeek,
    rows,
    measurements
  };
}

export function formatDiffDisplay(diff: number | null | undefined, isWaistOrBelly: boolean = false) {
  if (diff === null || diff === undefined) {
    return { text: '--', color: 'text-gray-400', bg: 'bg-transparent' };
  }
  if (diff === 0) {
    return { text: '0 cm', color: 'text-gray-500 font-semibold', bg: 'bg-gray-50' };
  }

  const sign = diff > 0 ? `+${diff}` : `${diff}`;
  const text = `${sign} cm`;

  // For waist/belly: negative (reduction) is great (emerald), positive is amber
  // For chest/hips/thigh/arm: both can be positive, but let's color code gently
  if (diff < 0) {
    return {
      text,
      color: 'text-emerald-700 font-bold',
      bg: 'bg-emerald-50 border border-emerald-200'
    };
  } else {
    return {
      text,
      color: 'text-brand-moss font-bold',
      bg: 'bg-brand-sand/30 border border-brand-sand/60'
    };
  }
}
