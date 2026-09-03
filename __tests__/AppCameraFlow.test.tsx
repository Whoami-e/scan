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
  captureDocument: jest.fn().mockResolvedValue({cancelled: false, imagePaths: ['file:///tmp/captured.jpg']}),
  importDocuments: jest.fn().mockResolvedValue({cancelled: false, imagePaths: ['content://one', 'content://two']}),
}));

jest.mock('../src/native/scannerModule', () => ({
  scannerModule: {
    capturePhoto: jest.fn().mockResolvedValue({imagePath: 'file:///tmp/captured.jpg'}),
    setFlash: jest.fn().mockResolvedValue(undefined),
    detectDocumentEdges: jest.fn().mockResolvedValue({corners: {topLeft: {x: 0.1, y: 0.1}, topRight: {x: 0.9, y: 0.1}, bottomRight: {x: 0.9, y: 0.9}, bottomLeft: {x: 0.1, y: 0.9}}, confidence: 0.8}),
    cropAndWarp: jest.fn().mockResolvedValue({processedImagePath: 'file:///tmp/cropped.jpg'}),
    rotateImage: jest.fn().mockResolvedValue({processedImagePath: 'file:///tmp/rotated-90.jpg'}),
    enhanceImage: jest.fn().mockResolvedValue({processedImagePath: 'file:///tmp/enhanced.jpg'}),
    createPdf: jest.fn().mockResolvedValue({pdfPath: 'file:///tmp/output.pdf'}),
    shareFile: jest.fn().mockResolvedValue(undefined),
    openFile: jest.fn().mockResolvedValue(undefined),
    exportLogs: jest.fn().mockResolvedValue({logFilePath: 'file:///tmp/log.txt'}),
    listPdfNames: jest.fn().mockResolvedValue([]),
  },
}));

import App from '../App';
import {captureDocument, importDocuments} from '../src/native/mediaPicker';
import {scannerModule} from '../src/native/scannerModule';

test('opens the camera and sends a captured URI to crop review', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;

  ReactTestRenderer.act(() => {
    root.findByProps({accessibilityLabel: '扫描'}).props.onPress();
  });
  expect(root.findByProps({accessibilityLabel: '拍照'})).toBeDefined();

  await ReactTestRenderer.act(async () => {
    root.findByProps({accessibilityLabel: '拍照'}).props.onPress();
  });
  expect(captureDocument).not.toHaveBeenCalled();
  expect(root.findAll(node => node.props.children === '调整边缘').length).toBeGreaterThan(0);
  expect(root.findByProps({accessibilityLabel: '待裁剪照片'}).props.source).toEqual({uri: 'file:///tmp/captured.jpg'});
});

test('keeps ordered gallery selections and starts with the first URI', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  ReactTestRenderer.act(() => {
    root.findByProps({accessibilityLabel: '扫描'}).props.onPress();
  });

  await ReactTestRenderer.act(async () => {
    root.findByProps({accessibilityLabel: '从相册导入'}).props.onPress();
  });
  expect(importDocuments).toHaveBeenCalledTimes(1);
  expect(root.findByProps({accessibilityLabel: '待裁剪照片'}).props.source).toEqual({uri: 'content://one'});
});

test('commits a captured photo through crop and enhance into the document', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '扫描'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '拍照'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '确认裁剪'}).props.onPress());
  expect(root.findAll(node => node.props.children === '图像增强').length).toBeGreaterThan(0);
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '增强'}).props.onPress());
  expect(scannerModule.enhanceImage).toHaveBeenLastCalledWith('file:///tmp/cropped.jpg', 'enhanced');
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '加入文档'}).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); });
  expect(root.findAll(node => node.props.children === '当前文档').length).toBeGreaterThan(0);
  expect(root.findByProps({accessibilityLabel: '第 1 页预览'})).toBeDefined();
});

test('returns the enhancement selector to original when native enhancement fails', async () => {
  jest.mocked(scannerModule.enhanceImage).mockRejectedValueOnce(Object.assign(new Error('ENHANCE_FAILED'), {code: 'ENHANCE_FAILED'}));

  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '扫描'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '拍照'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '确认裁剪'}).props.onPress());
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '增强'}).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); });

  expect(root.findByProps({accessibilityLabel: '原图'}).props.accessibilityState.selected).toBe(true);
});

test('rotates the cropped image by 90 degrees per tap before adding it', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });
  const root = renderer!.root;
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '扫描'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '拍照'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '确认裁剪'}).props.onPress());

  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '旋转页面'}).props.onPress());

  expect(scannerModule.rotateImage).toHaveBeenLastCalledWith('file:///tmp/cropped.jpg', 90);
  expect(root.findByProps({accessibilityLabel: '增强后的照片'}).props.source).toEqual({uri: 'file:///tmp/rotated-90.jpg'});
  const rotatedPaper = root.findByProps({testID: 'enhance-preview-paper'});
  const paperStyle = Array.isArray(rotatedPaper.props.style)
    ? Object.assign({}, ...rotatedPaper.props.style)
    : rotatedPaper.props.style;
  expect(paperStyle.aspectRatio).toBeCloseTo(1.41, 2);
});
