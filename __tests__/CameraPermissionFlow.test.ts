import fs from 'node:fs';
import path from 'node:path';

test('reopens the active camera view after permission is granted', () => {
  const activity = fs.readFileSync(
    path.join(process.cwd(), 'android/app/src/main/java/com/scanapp/MainActivity.kt'),
    'utf8',
  );
  const cameraView = fs.readFileSync(
    path.join(process.cwd(), 'android/app/src/main/java/com/scanapp/ScannerCameraView.kt'),
    'utf8',
  );

  expect(activity).toContain('override fun onRequestPermissionsResult');
  expect(activity).toContain('ScannerCameraView.activeView?.onPermissionResult');
  expect(cameraView).toContain('fun onPermissionResult');
  expect(cameraView).toContain('openCamera()');
});
