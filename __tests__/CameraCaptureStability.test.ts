import fs from 'node:fs';
import path from 'node:path';

const cameraView = fs.readFileSync(
  path.join(process.cwd(), 'android/app/src/main/java/com/scanapp/ScannerCameraView.kt'),
  'utf8',
);

test('does not restart preview from still-capture completion', () => {
  expect(cameraView).toContain('activeSession.capture(request, null, null)');
  expect(cameraView).not.toContain('override fun onCaptureCompleted');
});

test('reuses and releases the preview Surface with the camera lifecycle', () => {
  expect(cameraView).toContain('private var previewSurface: Surface? = null');
  expect(cameraView).toContain('previewSurface = Surface(texture)');
  expect(cameraView).toContain('previewSurface?.release()');
  expect(cameraView).toContain('previewSurface ?: return');
});
