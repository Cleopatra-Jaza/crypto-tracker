export type Point = { time: number; value: number };

function isFiniteNumber(v: number): boolean {
  return Number.isFinite(v);
}

export function sma(data: Point[], period: number): Point[] {
  if (data.length < period || period < 1) return [];
  const result: Point[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].value;
    if (i >= period) sum -= data[i - period].value;
    if (i >= period - 1) {
      const avg = sum / period;
      if (isFiniteNumber(avg)) {
        result.push({ time: data[i].time, value: avg });
      }
    }
  }
  return result;
}

export function ema(data: Point[], period: number): Point[] {
  if (data.length < period || period < 1) return [];
  const result: Point[] = [];
  // Seed with SMA of first period points
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].value;
  let prev = sum / period;
  if (!isFiniteNumber(prev)) return [];
  result.push({ time: data[period - 1].time, value: prev });
  const multiplier = 2 / (period + 1);
  for (let i = period; i < data.length; i++) {
    const val = data[i].value * multiplier + prev * (1 - multiplier);
    if (!isFiniteNumber(val)) return result;
    result.push({ time: data[i].time, value: val });
    prev = val;
  }
  return result;
}

export function rsi(data: Point[], period = 14): Point[] {
  if (data.length < period + 1 || period < 1) return [];
  const result: Point[] = [];
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i].value - data[i - 1].value;
    if (change > 0) gainSum += change;
    else lossSum -= change;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  const compute = (g: number, l: number): number => {
    if (l === 0) return 100;
    const rs = g / l;
    return 100 - 100 / (1 + rs);
  };
  let val = compute(avgGain, avgLoss);
  if (isFiniteNumber(val)) result.push({ time: data[period].time, value: val });
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i].value - data[i - 1].value;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    val = compute(avgGain, avgLoss);
    if (isFiniteNumber(val)) result.push({ time: data[i].time, value: val });
  }
  return result;
}

export function macd(
  data: Point[],
  fast = 12,
  slow = 26,
  signalPeriod = 9
): { macd: Point[]; signal: Point[]; histogram: Point[] } {
  const empty = { macd: [] as Point[], signal: [] as Point[], histogram: [] as Point[] };
  if (data.length < slow) return empty;
  const fastEma = ema(data, fast);
  const slowEma = ema(data, slow);
  if (fastEma.length === 0 || slowEma.length === 0) return empty;
  // Align by time - build map for fast
  const fastMap = new Map<number, number>();
  for (const p of fastEma) fastMap.set(p.time, p.value);
  const macdLine: Point[] = [];
  for (const p of slowEma) {
    const fv = fastMap.get(p.time);
    if (fv !== undefined) {
      const diff = fv - p.value;
      if (isFiniteNumber(diff)) macdLine.push({ time: p.time, value: diff });
    }
  }
  if (macdLine.length < signalPeriod) return { macd: macdLine, signal: [], histogram: [] };
  const signalLine = ema(macdLine, signalPeriod);
  const signalMap = new Map<number, number>();
  for (const p of signalLine) signalMap.set(p.time, p.value);
  const histogram: Point[] = [];
  for (const p of macdLine) {
    const sv = signalMap.get(p.time);
    if (sv !== undefined) {
      const h = p.value - sv;
      if (isFiniteNumber(h)) histogram.push({ time: p.time, value: h });
    }
  }
  return { macd: macdLine, signal: signalLine, histogram };
}