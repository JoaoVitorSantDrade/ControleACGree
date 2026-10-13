import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linuxAutostartEntry } from '../src/main/startupEntry';
test('Linux autostart quotes executable, development args and field codes',()=>{
  const entry=linuxAutostartEntry('/home/user/Gree Desktop 100%.AppImage',['/repo/my app']);
  assert.ok(entry.includes('Exec="/home/user/Gree Desktop 100%%.AppImage" "/repo/my app" "--background"'));
  assert.ok(entry.includes('Terminal=false'));
});
