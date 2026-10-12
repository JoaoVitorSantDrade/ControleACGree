import { mkdir, writeFile } from 'node:fs/promises';
import { discover, interfaces, bind, readStatus, command } from '../src/main/protocol.mjs';

const report = { date: new Date().toISOString(), interfaces: interfaces(), devices: [], errors: [] };
try {
  const ip = process.argv.find(a => a.startsWith('--ip='))?.slice(5);
  const scan = await discover({ addresses: ip ? [ip] : undefined });
  report.targets = scan.targets;
  report.errors.push(...scan.errors);
  for (const device of scan.devices) {
    const entry = { ...device, binding: false, reading: false, control: 'não testado' };
    report.devices.push(entry);
    try {
      const key = await bind(device);
      entry.binding = true;
      entry.state = await readStatus(device, key);
      entry.reading = true;
      // Explicit opt-in; reapply the existing setpoint without changing thermal behavior.
      if (process.argv.includes('--verify-command') && Number.isInteger(entry.state.SetTem)) {
        await command(device, key, { SetTem: entry.state.SetTem });
        entry.control = 'temperatura existente reaplicada e confirmada';
      }
    } catch (error) { entry.error = error.message; }
  }
} catch (error) { report.errors.push(error.message); }
await mkdir('diagnostics', { recursive: true });
await writeFile('diagnostics/latest.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.devices.some(d => d.reading)) process.exitCode = 2;
