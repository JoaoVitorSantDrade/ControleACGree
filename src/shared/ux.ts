import type { Device } from './types';

export function ambientReading(device: Device, now: number, pollSeconds: number) {
  const raw = device.state.TemSen;
  const valid = Number.isFinite(raw) && raw >= 20 && raw <= 100;
  const value = valid ? raw - 40 : undefined;
  const fresh = valid && device.online && device.lastSeen !== undefined && now - device.lastSeen <= (pollSeconds * 2 + 5) * 1000;
  return { value, fresh, label: fresh ? `${value} °C` : valid ? 'Sem leitura atual' : 'Indisponível' };
}
export function ambientSummary(devices: Device[], now: number, pollSeconds: number) {
  const readings = devices.map(device => ({ device, ...ambientReading(device, now, pollSeconds) }));
  const values = readings.filter(r => r.fresh).map(r => r.value!);
  const min = Math.min(...values), max = Math.max(...values);
  return { readings, count: values.length, label: devices.length === 1 ? readings[0].label : values.length ? `${min === max ? min : `${min}–${max}`} °C` : readings.some(r => r.value !== undefined) ? 'Sem leitura atual' : 'Indisponível' };
}
// The thumb travels inside the track; the fill ends at its center, including at the extremes.
export function sliderCenter(value: number, min = 16, max = 30, thumb = 38) {
  const ratio = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return `calc(${ratio * 100}% + ${thumb / 2 - ratio * thumb}px)`;
}
export function pointerTemperature(x: number, left: number, width: number, min = 16, max = 30) {
  return min + Math.max(0, Math.min(1, (x - left - 19) / Math.max(1, width - 38))) * (max - min);
}
export const toastDuration = { success: 4000, partial: 6000, error: 8000, info:6000 } as const;
