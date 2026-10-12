import dgram from 'node:dgram';
import os from 'node:os';
import { createCipheriv, createDecipheriv } from 'node:crypto';

const GENERIC = 'a3K8Bx%2r8Y7#xDh';
const GCM_KEY = '{yxAHAY_Lm6pbC/<';
const IV = Buffer.from('5440784449675a516c5e6313', 'hex');
export function encrypt(data, key = GENERIC) {
  const cipher = createCipheriv('aes-128-ecb', Buffer.from(key), null);
  return Buffer.concat([cipher.update(JSON.stringify(data)), cipher.final()]).toString('base64');
}
export function decode(packet, key) {
  const outer = JSON.parse(packet.toString());
  if (!outer.pack) return outer;
  if (outer.tag) {
    const decipher = createDecipheriv('aes-128-gcm', Buffer.from(key || GCM_KEY), IV);
    decipher.setAAD(Buffer.from('qualcomm-test'));
    decipher.setAuthTag(Buffer.from(outer.tag, 'base64'));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(outer.pack, 'base64')), decipher.final()]).toString());
  }
  const decipher = createDecipheriv('aes-128-ecb', Buffer.from(key || GENERIC), null);
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(outer.pack, 'base64')), decipher.final()]).toString());
}
export function envelope(mac, payload, key, mode = 'ECB') {
  key ||= mode === 'GCM' ? GCM_KEY : GENERIC;
  let encrypted = { pack: encrypt(payload, key) };
  if (mode === 'GCM') {
    const cipher = createCipheriv('aes-128-gcm', Buffer.from(key), IV);
    cipher.setAAD(Buffer.from('qualcomm-test'));
    encrypted = { pack: Buffer.concat([cipher.update(JSON.stringify(payload)), cipher.final()]).toString('base64'), tag: cipher.getAuthTag().toString('base64') };
  }
  return Buffer.from(JSON.stringify({ cid: 'app', i: payload.t === 'bind' ? 1 : 0, t: 'pack', tcid: mac, uid: 0, ...encrypted }));
}
export function interfaces() {
  return Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) => (addresses || []).filter(a => a.family === 'IPv4' && !a.internal).map(a => {
    const ip = a.address.split('.').map(Number), mask = a.netmask.split('.').map(Number);
    return { name, address: a.address, broadcast: ip.map((n, i) => (n | (~mask[i] & 255))).join('.') };
  }));
}
/** @param {{timeout?: number, addresses?: string[], port?: number}} options */
export async function discover({ timeout = 5000, addresses, port = 7000 } = {}) {
  const found = new Map(), errors = [];
  const targets = addresses || interfaces().map(i => i.broadcast);
  if (!targets.length) throw new Error('Nenhuma interface IPv4 local disponível.');
  await new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let timer, repeat;
    socket.on('error', err => { clearTimeout(timer); clearInterval(repeat); socket.close(); reject(err); });
    socket.on('message', (packet, peer) => {
      try {
        const data = decode(packet);
        if (data.t === 'dev' && typeof data.mac === 'string') found.set(data.mac.toLowerCase(), { mac: data.mac.toLowerCase(), ip: peer.address, name: data.name || 'Gree', model: data.model, firmware: data.ver });
      } catch { errors.push('Resposta UDP inválida recebida.'); }
    });
    socket.bind(0, () => {
      socket.setBroadcast(true);
      const scan = () => { for (const address of new Set(targets)) socket.send(Buffer.from('{"t":"scan"}'), port, address, err => { if (err) errors.push(err.message); }); };
      scan();
      repeat = setInterval(scan,Math.min(1000,Math.max(30,Math.floor(timeout/3))));
      timer = setTimeout(() => { clearInterval(repeat); socket.close(); resolve(); }, timeout);
    });
  });
  return { devices: [...found.values()], errors, targets };
}
export async function request(device, payload, key = GENERIC, { timeout = 3500, port = 7000 } = {}) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let timer, ended = false;
    const finish = (err, value) => { if (ended) return; ended = true; clearTimeout(timer); socket.close(); err ? reject(err) : resolve(value); };
    socket.on('error', err => finish(err));
    socket.on('message', (packet, peer) => {
      if (peer.address !== device.ip || peer.port !== port) return;
      try {
        const response = decode(packet, key);
        if (response.mac && response.mac.toLowerCase() !== device.mac.toLowerCase()) return;
        const expected = { bind: 'bindok', status: 'dat', cmd: 'res' }[payload.t];
        if (response.t !== expected) return;
        if (response.r !== undefined && response.r !== 200) return finish(new Error(`Aparelho respondeu código ${response.r}.`));
        finish(null, response);
      } catch { /* Ignore unrelated or malformed datagrams until timeout. */ }
    });
    socket.bind(0, () => {
      timer = setTimeout(() => finish(new Error(`Sem resposta de ${device.ip}:${port} (${payload.t}).`)), timeout);
      socket.send(envelope(device.mac, payload, key, device.encryption || 'ECB'), port, device.ip, err => { if (err) finish(err); });
    });
  });
}
export async function bind(device, options) {
  let response;
  try { response = await request(device, { mac: device.mac, t: 'bind', uid: 0 }, device.encryption === 'GCM' ? GCM_KEY : GENERIC, options); }
  catch (error) {
    if (device.encryption === 'GCM') throw error;
    device.encryption = 'GCM';
    response = await request(device, { mac: device.mac, t: 'bind', uid: 0 }, GCM_KEY, options);
  }
  if (typeof response.key !== 'string' || Buffer.byteLength(response.key) !== 16) throw new Error('Chave de vinculação inválida.');
  return response.key;
}
export const columns = ['Pow', 'Mod', 'SetTem', 'TemUn', 'WdSpd', 'SwUpDn', 'SwingLfRig', 'Lig', 'Quiet', 'Tur', 'Blo', 'SwhSlp', 'TemSen'];
export async function readStatus(device, key, options) {
  const response = await request(device, { t: 'status', mac: device.mac, cols: columns }, key, options);
  if (!Array.isArray(response.cols) || !Array.isArray(response.dat) || response.cols.length !== response.dat.length) throw new Error('Estado inválido.');
  return Object.fromEntries(response.cols.flatMap((col, i) => typeof response.dat[i] === 'number' && Number.isFinite(response.dat[i]) ? [[col, response.dat[i]]] : []));
}
export async function command(device, key, patch, options) {
  await request(device, { t: 'cmd', opt: Object.keys(patch), p: Object.values(patch) }, key, options);
  const state = await readStatus(device, key, options);
  if (Object.entries(patch).some(([col, value]) => state[col] !== value)) throw new Error('Comando enviado, mas não confirmado pela leitura do aparelho.');
  return state;
}
