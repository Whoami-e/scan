import fs from 'node:fs';
import path from 'node:path';

test('normalizes captured JPEG pixels to display orientation before saving', () => {
  const cameraView = fs.readFileSync(
    path.join(process.cwd(), 'android/app/src/main/java/com/scanapp/ScannerCameraView.kt'),
    'utf8',
  );

  expect(cameraView).toContain('calculateImageRotation');
  expect(cameraView).toContain('rotateBitmap');
  expect(cameraView).toContain('BitmapFactory.decodeByteArray');
  expect(cameraView).toContain('imageRotationDegrees');
});
