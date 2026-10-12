import { isIP } from 'node:net';
import type { Rule, Patch, Target, Condition, Settings } from '../shared/types';
export const ranges: Record<string, [number, number]> = { Pow: [0,1], Mod: [0,4], SetTem: [16,30], WdSpd: [0,5], SwUpDn: [0,11], SwingLfRig: [0,6], Lig: [0,1], Quiet: [0,1], Tur: [0,1], Blo: [0,1], SwhSlp: [0,1] };
export function ensure(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
export function text(value: unknown, max = 80): asserts value is string { ensure(typeof value === 'string' && value.trim().length > 0 && value.length <= max, 'Texto inválido.'); }
export function target(value: Target) { ensure(value && ['device','group'].includes(value.kind), 'Destino inválido.'); text(value.id); }
export function patch(value: Patch) {
  ensure(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0, 'Ação vazia.');
  for (const [key, v] of Object.entries(value)) { const range = ranges[key]; ensure(range && Number.isInteger(v) && v >= range[0] && v <= range[1], `Valor inválido para ${key}.`); }
}
function condition(c: Condition) {
  ensure(c && ['ambient','Pow','Mod','SetTem','WdSpd','onMinutes'].includes(c.field) && ['gt','lt','eq'].includes(c.op) && Number.isFinite(c.value), 'Condição inválida.');
}
export function rule(r: Rule) {
  ensure(r && typeof r === 'object', 'Regra inválida.'); text(r.id); text(r.name); target(r.target); patch(r.action);
  ensure(typeof r.enabled === 'boolean' && ['all','any'].includes(r.match) && Array.isArray(r.conditions) && r.conditions.length <= 20, 'Condições inválidas.');
  r.conditions.forEach(condition);
  ensure(Number.isFinite(r.cooldownMinutes) && r.cooldownMinutes >= 1 && r.cooldownMinutes <= 1440, 'Intervalo mínimo inválido.');
  const t = r.trigger; ensure(t && typeof t === 'object', 'Gatilho inválido.');
  switch (t.kind) {
    case 'schedule': ensure(Array.isArray(t.days) && t.days.length > 0 && t.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6) && /^([01]\d|2[0-3]):[0-5]\d$/.test(t.time), 'Agenda inválida.'); break;
    case 'timer': ensure(Number.isFinite(t.at) && t.at > 0, 'Temporizador inválido.'); break;
    case 'temperature': ensure(['gt','lt'].includes(t.op) && Number.isFinite(t.value) && t.value >= -20 && t.value <= 60 && t.hysteresis >= 0.5 && t.hysteresis <= 10, 'Temperatura ou histerese inválida.'); break;
    case 'state': ensure(['Pow','Mod'].includes(t.field) && Number.isInteger(t.value) && t.value >= 0 && t.value <= (t.field === 'Pow' ? 1 : 4), 'Estado inválido.'); break;
    case 'duration': ensure(Number.isFinite(t.minutes) && t.minutes >= 1 && t.minutes <= 10080, 'Duração inválida.'); break;
    default: throw new Error('Gatilho desconhecido.');
  }
}
export function settings(s: Settings) { ensure(s && ['light','dark','system'].includes(s.theme) && typeof s.startup === 'boolean' && Number.isInteger(s.pollSeconds) && s.pollSeconds >= 5 && s.pollSeconds <= 120, 'Preferências inválidas.'); }
export function ip(value: string) { ensure(isIP(value) === 4 && !['0.0.0.0','255.255.255.255'].includes(value), 'Informe um endereço IPv4 válido.'); }
