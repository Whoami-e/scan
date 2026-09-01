import fs from 'node:fs';
import path from 'node:path';

test('uses a camera output size and texture transform that preserve preview aspect ratio', () => {
  const cameraView = fs.readFileSync(
    path.join(process.cwd(), 'android/app/src/main/java/com/scanapp/ScannerCameraView.kt'),
    'utf8',
  );

  expect(cameraView).toContain('choosePreviewSize');
  expect(cameraView).toContain('setDefaultBufferSize(selectedPreviewSize.width, selectedPreviewSize.height)');
  expect(cameraView).toContain('applyPreviewTransform');
  expect(cameraView).toContain('calculatePreviewRotation');
  expect(cameraView).toContain('previewRotationDegrees');
  expect(cameraView).toContain('setRectToRect');
  expect(cameraView).toContain('Matrix.ScaleToFit.CENTER');
  expect(cameraView).toContain('return displayDegrees');
  expect(cameraView).toContain('setTransform');
  expect(cameraView).toContain('onSurfaceTextureSizeChanged');
});

test('locks the Android activity to portrait orientation', () => {
  const manifest = fs.readFileSync(
    path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'),
    'utf8',
  );

  expect(manifest).toContain('android:screenOrientation="portrait"');
});
