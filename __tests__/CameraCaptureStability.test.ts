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

test('clears a pending capture when the host pauses and resumes safely', () => {
  expect(cameraView).toContain('fun onHostPause()');
  expect(cameraView).toContain('clearPendingCapture');
  expect(cameraView).toContain('clearPendingCapture("CAMERA_PAUSED"');
});

test('processes captured JPEGs on a dedicated executor with a bounded timeout', () => {
  expect(cameraView).toContain('Executors.newSingleThreadExecutor');
  expect(cameraView).toContain('CAPTURE_PROCESSING_TIMEOUT_MS');
  expect(cameraView).toContain('processCaptureImage');
});

test('guards capture completion so a promise is settled at most once', () => {
  expect(cameraView).toContain('AtomicBoolean');
  expect(cameraView).toContain('compareAndSet(false, true)');
  expect(cameraView).toContain('clearPendingCapture');
});

test('forwards host pause to the active camera view', () => {
  const activity = fs.readFileSync(
    path.join(process.cwd(), 'android/app/src/main/java/com/scanapp/MainActivity.kt'),
    'utf8',
  );

  expect(activity).toContain('override fun onPause()');
  expect(activity).toContain('ScannerCameraView.activeView?.onHostPause()');
});

test('renders only stable document corners from the native preview event', () => {
  const cameraScreen = fs.readFileSync(
    path.join(process.cwd(), 'src/screens/CameraScreen.tsx'),
    'utf8',
  );

  expect(cameraScreen).toContain('onDocumentCorners');
  expect(cameraScreen).toContain('camera-document-corners');
  expect(cameraScreen).toContain('source');
  expect(cameraScreen).toContain('confidence');
});

test('throttles live analysis and prevents concurrent work', () => {
  expect(cameraView).toContain('LIVE_ANALYSIS_INTERVAL_MS = 350L');
  expect(cameraView).toContain('liveAnalysisInFlight');
  expect(cameraView).toContain('compareAndSet(false, true)');
});
