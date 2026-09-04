import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Image} from 'react-native';
import {Button} from 'react-native-paper';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import PagesScreen from '../src/screens/PagesScreen';
import {MAX_TITLE_TEXT_SCALE} from '../src/theme/responsive';

const pages = [{
  id: 'page-1',
  originalImagePath: 'file:///sandbox/original.jpg',
  processedImagePath: 'file:///sandbox/processed.jpg',
  rotationDegrees: 0,
  enhanceMode: 'original' as const,
  source: 'camera' as const,
  createdAt: '2026-09-04T00:00:00.000Z',
}];

function renderPages(): ReactTestRenderer.ReactTestRenderer {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<PagesScreen />);
  });
  return renderer!;
}

test('matches the energetic multi-page management landmarks', () => {
  const renderer = renderPages();
  const titleButton = renderer.root.findByProps({accessibilityLabel: '编辑文档标题'});
  expect(titleButton).toBeDefined();
  const titleText = renderer.root.findByProps({accessibilityRole: 'header'});
  expect(String(titleText.props.children)).toMatch(/^未命名文档 \d{4}$/);
  expect(titleText.props.style).toEqual(expect.objectContaining({textAlign: 'center'}));
  expect(titleText.props.style).toEqual(expect.objectContaining({fontSize: 24, lineHeight: 30}));
  expect(titleText.props.maxFontSizeMultiplier).toBe(MAX_TITLE_TEXT_SCALE);
  expect(renderer.root.findByProps({accessibilityLabel: '再拍别的照片'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '相册导入'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '导出 PDF'})).toBeDefined();
  expect(renderer.root.findAllByType(Button)).toHaveLength(2);
});

test('keeps the generated title stable across parent re-renders', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<PagesScreen />);
  });
  const firstTitle = String(renderer!.root.findByProps({accessibilityRole: 'header'}).props.children);
  ReactTestRenderer.act(() => {
    renderer!.update(<PagesScreen />);
  });
  const secondTitle = String(renderer!.root.findByProps({accessibilityRole: 'header'}).props.children);
  expect(secondTitle).toBe(firstTitle);
});

test('clicking the document title opens an inline editor', () => {
  const renderer = renderPages();
  ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: '编辑文档标题'}).props.onPress();
  });
  expect(renderer.root.findByProps({accessibilityLabel: '文档标题输入框'})).toBeDefined();
});

test('provides a back control that delegates to the parent', () => {
  const onBack = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<PagesScreen onBack={onBack} />);
  });
  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({accessibilityLabel: '返回首页'}).props.onPress();
  });
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('opens a full page preview from each document card', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<PagesScreen pages={pages} />);
  });

  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({accessibilityLabel: '预览第 1 页'}).props.onPress();
  });

  expect(renderer!.root.findByProps({accessibilityLabel: '第 1 页大图预览'})).toBeDefined();
  expect(renderer!.root.findByType(Image).props.source).toEqual({uri: 'file:///sandbox/processed.jpg'});
});

test('closes the page preview and returns to the document cards', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<PagesScreen pages={pages} />);
  });

  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({accessibilityLabel: '预览第 1 页'}).props.onPress();
  });
  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({accessibilityLabel: '关闭页面预览'}).props.onPress();
  });

  expect(renderer!.root.findAllByProps({accessibilityLabel: '第 1 页大图预览'})).toHaveLength(0);
});

test('passes the deleted page resources to the parent cleanup handler', () => {
  const onDeletePage = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<PagesScreen pages={pages} onDeletePage={onDeletePage} />);
  });

  const alert = jest.spyOn(require('react-native').Alert, 'alert').mockImplementation(((_title: string, _message: string, actions?: Array<{text?: string; onPress?: () => void}>) => {
    actions?.find(action => action.text === '删除')?.onPress?.();
  }) as never);
  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({accessibilityLabel: '删除第 1 页'}).props.onPress();
  });

  expect(onDeletePage).toHaveBeenCalledWith(pages[0]);
  alert.mockRestore();
});
