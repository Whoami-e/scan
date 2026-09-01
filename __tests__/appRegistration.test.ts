import fs from 'node:fs';
import path from 'node:path';

import {name as appName} from '../app.json';

test('native launchers use the JavaScript registration name', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const mainActivity = fs.readFileSync(
    path.join(projectRoot, 'android/app/src/main/java/com/scanapp/MainActivity.kt'),
    'utf8',
  );
  const appDelegate = fs.readFileSync(
    path.join(projectRoot, 'ios/ScanApp/AppDelegate.swift'),
    'utf8',
  );

  expect(appName).toBe('ScanApp');
  expect(mainActivity).toContain(`getMainComponentName(): String = "${appName}"`);
  expect(appDelegate).toContain(`withModuleName: "${appName}"`);
});
