import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Button} from 'react-native-paper';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import PagesScreen from '../src/screens/PagesScreen';

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
