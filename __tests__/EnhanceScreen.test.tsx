import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Image} from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import EnhanceScreen from '../src/screens/EnhanceScreen';

function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return (style ?? {}) as Record<string, unknown>;
}

test('renders a larger clean preview without guide lines or placeholder blocks', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<EnhanceScreen imagePath="file:///tmp/cropped.jpg" />);
  });

  const root = renderer!.root;
  const preview = root.findByProps({testID: 'enhance-preview-paper'});
  const previewStyle = flattenStyle(preview.props.style);
  expect(previewStyle.width).toBe('96%');
  expect(previewStyle.maxWidth).toBe(400);
  expect(previewStyle.maxHeight).toBe('100%');
  expect(root.findByType(Image).props.source).toEqual({uri: 'file:///tmp/cropped.jpg'});
  expect(root.findAllByProps({testID: 'enhance-preview-guide-line'})).toHaveLength(0);
  expect(root.findAllByProps({testID: 'enhance-preview-placeholder'})).toHaveLength(0);

  const screenStyle = flattenStyle(root.findByProps({testID: 'enhance-screen'}).props.style);
  expect(screenStyle.backgroundColor).toBe('#FFFFFF');
  const workspaceStyle = flattenStyle(root.findByProps({testID: 'enhance-workspace'}).props.style);
  expect(workspaceStyle.backgroundColor).toBe('#FFFFFF');
  const title = root.findAll(node => node.props.children === '图像增强')[0];
  expect(flattenStyle(title.props.style).color).toBe('#1D1836');
  const previewHint = root.findAll(node => node.props.children === '预览效果')[0];
  expect(flattenStyle(previewHint.props.style).color).toBe('#796F91');
  const backButton = root.findByProps({accessibilityLabel: '返回裁剪'});
  expect(flattenStyle(backButton.props.style).backgroundColor).toBe('#17122B');
  const rotateButton = root.findByProps({accessibilityLabel: '旋转页面'});
  expect(rotateButton.props.iconColor).toBe('#FFF8D7');
  const tools = root.findByProps({testID: 'enhance-tools'});
  expect(flattenStyle(tools.props.style).backgroundColor).toBe('#27233D');
});

test('reports the selected mode and passes it to add-page', () => {
  const onModeChange = jest.fn();
  const onAddPage = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<EnhanceScreen onModeChange={onModeChange} onAddPage={onAddPage} />);
  });

  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({accessibilityLabel: '灰度'}).props.onPress();
    renderer!.root.findByProps({accessibilityLabel: '加入文档'}).props.onPress();
  });

  expect(onModeChange).toHaveBeenCalledWith('grayscale');
  expect(onAddPage).toHaveBeenCalledWith('grayscale');
});

test('keeps the preview frame styling stable while switching modes', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<EnhanceScreen imagePath="file:///tmp/cropped.jpg" />);
  });

  const preview = () => flattenStyle(renderer!.root.findByProps({testID: 'enhance-preview-paper'}).props.style);
  ReactTestRenderer.act(() => renderer!.root.findByProps({accessibilityLabel: '灰度'}).props.onPress());
  expect(preview()).toEqual(expect.objectContaining({backgroundColor: '#FFFFFF'}));
  expect(preview().borderWidth).toBeUndefined();

  expect(renderer!.root.findAllByProps({accessibilityLabel: '黑白'})).not.toHaveLength(0);
  expect(renderer!.root.findAllByProps({accessibilityLabel: '原图'})).not.toHaveLength(0);
  expect(renderer!.root.findAllByProps({accessibilityLabel: '增强'})).not.toHaveLength(0);
  expect(renderer!.root.findAllByProps({accessibilityLabel: '灰度'})).not.toHaveLength(0);
});

test('announces the selected enhancement mode in the preview label', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<EnhanceScreen imagePath="file:///tmp/cropped.jpg" />);
  });

  expect(renderer!.root.findByProps({accessibilityLabel: '图像预览：原图'})).toBeDefined();

  ReactTestRenderer.act(() => renderer!.root.findByProps({accessibilityLabel: '灰度'}).props.onPress());

  expect(renderer!.root.findByProps({accessibilityLabel: '图像预览：灰度'})).toBeDefined();
});

test('switches the preview frame to landscape after a 90 degree rotation', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<EnhanceScreen rotationDegrees={90} />);
  });

  const previewStyle = flattenStyle(renderer!.root.findByProps({testID: 'enhance-preview-paper'}).props.style);
  expect(previewStyle.aspectRatio).toBeCloseTo(1.41, 2);
});

test('offers blackwhite mode and passes it through unchanged', () => {
  const onModeChange = jest.fn();
  const onAddPage = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<EnhanceScreen onModeChange={onModeChange} onAddPage={onAddPage} />);
  });

  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({accessibilityLabel: '黑白'}).props.onPress();
    renderer!.root.findByProps({accessibilityLabel: '加入文档'}).props.onPress();
  });

  expect(onModeChange).toHaveBeenCalledWith('blackwhite');
  expect(onAddPage).toHaveBeenCalledWith('blackwhite');
});
