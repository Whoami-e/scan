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
  captureDocument: jest.fn(),
  importDocuments: jest.fn(),
}));

jest.mock('../src/native/scannerModule', () => ({
  scannerModule: {
    capturePhoto: jest.fn().mockRejectedValue(new Error('内嵌相机拍照失败')),
    setFlash: jest.fn().mockResolvedValue(undefined),
    detectDocumentEdges: jest.fn().mockRejectedValue(new Error('检测失败')),
    cropAndWarp: jest.fn(),
    enhanceImage: jest.fn(),
    createPdf: jest.fn(),
    shareFile: jest.fn(),
    openFile: jest.fn(),
    exportLogs: jest.fn(),
    listPdfNames: jest.fn().mockResolvedValue([]),
  },
}));

import App from '../App';
import {captureDocument, importDocuments} from '../src/native/mediaPicker';
import {scannerModule} from '../src/native/scannerModule';

test('keeps capture inside the app when the embedded camera fails', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '扫描'}).props.onPress());

  await ReactTestRenderer.act(async () => {
    root.findByProps({accessibilityLabel: '拍照'}).props.onPress();
  });

  expect(captureDocument).not.toHaveBeenCalled();
  expect(root.findAll(node => node.props.children === '相机拍摄失败，请重试或从相册导入').length).toBeGreaterThan(0);
  expect(root.findByProps({accessibilityLabel: '相机画面区域'})).toBeDefined();
});

test('keeps the crop flow when edge detection reports an optional source', async () => {
  jest.mocked(importDocuments).mockResolvedValueOnce({
    cancelled: false,
    imagePaths: ['file:///tmp/gallery.jpg'],
  });
  jest.mocked(scannerModule.detectDocumentEdges).mockResolvedValueOnce({
    corners: {
      topLeft: {x: 0.1, y: 0.1},
      topRight: {x: 0.9, y: 0.1},
      bottomRight: {x: 0.9, y: 0.9},
      bottomLeft: {x: 0.1, y: 0.9},
    },
    confidence: 0.2,
    source: 'fallback',
  });

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '扫描'}).props.onPress());

  await ReactTestRenderer.act(async () => {
    root.findByProps({accessibilityLabel: '从相册导入'}).props.onPress();
  });

  expect(root.findByProps({accessibilityLabel: '待裁剪照片'}).props.source).toEqual({uri: 'file:///tmp/gallery.jpg'});
});
