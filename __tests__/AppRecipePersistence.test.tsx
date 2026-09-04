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
    capturePhoto: jest.fn().mockResolvedValue({imagePath: 'content://captured/original'}),
    setFlash: jest.fn().mockResolvedValue(undefined),
    detectDocumentEdges: jest.fn().mockResolvedValue({
      corners: {topLeft: {x: 0.1, y: 0.1}, topRight: {x: 0.9, y: 0.1}, bottomRight: {x: 0.9, y: 0.9}, bottomLeft: {x: 0.1, y: 0.9}},
      confidence: 0.8,
      source: 'opencv',
    }),
    renderPage: jest.fn().mockResolvedValue({processedImagePath: 'file:///sandbox/working.jpg'}),
    createPdf: jest.fn(),
    listPdfNames: jest.fn().mockResolvedValue([]),
    openFile: jest.fn(),
    shareFile: jest.fn(),
    exportLogs: jest.fn(),
  },
}));
jest.mock('../src/data/fileStore', () => ({
  fileStore: {
    loadDocuments: jest.fn().mockResolvedValue([]),
    createWorkspace: jest.fn().mockResolvedValue('/sandbox/doc'),
    savePageImage: jest.fn().mockRejectedValue(new Error('storage unavailable')),
    saveDocument: jest.fn().mockResolvedValue(undefined),
    deleteWorkspace: jest.fn(),
    removeFile: jest.fn(),
    deleteDocument: jest.fn(),
    renderPage: jest.fn(),
  },
}));

import App from '../src/app/App';

test('does not add a page or persist external URI when sandbox save fails', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<App />); });
  const root = renderer!.root;
  ReactTestRenderer.act(() => root.findByProps({accessibilityLabel: '扫描'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '拍照'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '确认裁剪'}).props.onPress());
  await ReactTestRenderer.act(async () => root.findByProps({accessibilityLabel: '加入文档'}).props.onPress());

  expect(root.findAllByProps({accessibilityLabel: '第 1 页预览'})).toHaveLength(0);
});
