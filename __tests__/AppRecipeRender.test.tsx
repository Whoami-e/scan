import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {...actual, PaperProvider: ({children}: {children: React.ReactNode}) => children};
});
jest.mock('../src/native/mediaPicker', () => ({
  importDocuments: jest.fn().mockResolvedValue({cancelled: true, imagePaths: []}),
}));
jest.mock('../src/native/scannerModule', () => ({
  scannerModule: {
    capturePhoto: jest.fn().mockResolvedValue({imagePath: 'file:///tmp/original.jpg'}),
    setFlash: jest.fn().mockResolvedValue(undefined),
    detectDocumentEdges: jest.fn().mockResolvedValue({
      corners: {topLeft: {x: 0.1, y: 0.1}, topRight: {x: 0.9, y: 0.1}, bottomRight: {x: 0.9, y: 0.9}, bottomLeft: {x: 0.1, y: 0.9}},
      confidence: 0.8,
      source: 'fairscan',
    }),
    renderPage: jest.fn().mockResolvedValue({processedImagePath: 'file:///tmp/rendered.jpg'}),
    createPdf: jest.fn(),
    listPdfNames: jest.fn().mockResolvedValue([]),
    openFile: jest.fn(),
    shareFile: jest.fn(),
    exportLogs: jest.fn(),
  },
}));

import App from '../src/app/App';
import {scannerModule} from '../src/native/scannerModule';

test('rerenders every edit from the captured original and recipe', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<App />); });
  const root = renderer!.root;
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '扫描'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '拍照'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '确认裁剪'}).props.onPress());

  expect(scannerModule.renderPage).toHaveBeenCalledWith(
    'file:///tmp/original.jpg',
    expect.objectContaining({enhanceMode: 'original', rotationDegrees: 0}),
  );
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '增强'}).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); });
  expect(scannerModule.renderPage).toHaveBeenLastCalledWith(
    'file:///tmp/original.jpg',
    expect.objectContaining({enhanceMode: 'enhanced'}),
  );

  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '旋转页面'}).props.onPress());
  expect(scannerModule.renderPage).toHaveBeenLastCalledWith(
    'file:///tmp/original.jpg',
    expect.objectContaining({enhanceMode: 'enhanced', rotationDegrees: 90}),
  );
});
