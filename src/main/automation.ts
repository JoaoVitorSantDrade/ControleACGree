import type { Device, Rule, Condition } from '../shared/types';
export interface Runtime { last?: number; token?: string; latched?: boolean; previous?: number; seen?: number }
export function ambient(device: Device): number | undefined {
  const raw = device.state.TemSen;
  return Number.isFinite(raw) && raw >= 20 && raw <= 100 ? raw - 40 : undefined;
}
export function field(device: Device, name: Condition['field'], now: number) {
  if (name === 'ambient') return ambient(device);
  if (name === 'onMinutes') return device.poweredSince === undefined ? undefined : (now - device.poweredSince) / 60000;
  return device.state[name];
}
export function matches(device: Device, conditions: Condition[], mode: 'all' | 'any', now: number) {
  if (!conditions.length) return true;
  const outcomes = conditions.map(c => {
    const value = field(device, c.field, now);
    return value !== undefined && (c.op === 'gt' ? value > c.value : c.op === 'lt' ? value < c.value : value === c.value);
  });
  return mode === 'all' ? outcomes.every(Boolean) : outcomes.some(Boolean);
}
export function scheduleToken(rule: Rule, now: number): string | undefined {
  if (rule.trigger.kind !== 'schedule') return;
  const date = new Date(now);
  const time = `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  if (!rule.trigger.days.includes(date.getDay()) || time !== rule.trigger.time) return;
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${time}`;
}
/** Pure evaluator. Runtime is per rule/device and persisted only after evaluation. */
export function evaluate(rule: Rule, device: Device, runtime: Runtime, now: number, previousTick: number, freshness: number) {
  const t = rule.trigger;
  const gap = now - previousTick > 65000 || now < previousTick;
  const fresh = device.online && device.lastSeen !== undefined && now - device.lastSeen <= freshness;
  let fire = false, missed = false;
  if (t.kind === 'schedule') {
    const token = scheduleToken(rule, now);
    if (token && token !== runtime.token) { runtime.token = token; fire = !gap; missed = gap; }
  } else if (t.kind === 'timer') {
    if (now >= t.at && runtime.token !== String(t.at)) { runtime.token = String(t.at); fire = !gap && t.at > previousTick; missed = !fire; }
  } else if (fresh && runtime.seen !== device.lastSeen) {
    if (t.kind === 'temperature') {
      const value = ambient(device);
      if (value !== undefined) {
        const active = t.op === 'gt' ? value > t.value : value < t.value;
        const reset = t.op === 'gt' ? value <= t.value - t.hysteresis : value >= t.value + t.hysteresis;
        if (reset) runtime.latched = false;
        if (active && !runtime.latched) { fire = true; runtime.latched = true; }
      }
    } else if (t.kind === 'state') {
      const value = device.state[t.field];
      fire = value !== undefined && runtime.previous !== undefined && runtime.previous !== value && value === t.value;
      runtime.previous = value;
    } else if (t.kind === 'duration') {
      const active = device.poweredSince !== undefined && now - device.poweredSince >= t.minutes * 60000;
      if (!active) runtime.latched = false;
      if (active && !runtime.latched) { fire = true; runtime.latched = true; }
    }
    runtime.seen = device.lastSeen;
  }
  if (!fresh && t.kind === 'state') runtime.previous = undefined;
  if (!fire) return missed ? 'missed' : 'none';
  if (!fresh) return 'offline';
  if(device.externalOverride)return 'protected';
  if (device.pausedUntil && device.pausedUntil > now) return 'paused';
  if (runtime.last !== undefined && now - runtime.last < rule.cooldownMinutes * 60000) return 'cooldown';
  if (!matches(device, rule.conditions, rule.match, now)) return 'conditions';
  runtime.last = now;
  return 'fire';
}
