import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {StyleSheet} from 'react-native';
import Svg from 'react-native-svg';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import CameraScreen from '../src/screens/CameraScreen';
import {theme} from '../src/theme/theme';
import {MAX_TEXT_SCALE} from '../src/theme/responsive';

function renderCamera(props: React.ComponentProps<typeof CameraScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<CameraScreen {...props} />);
  });
  return renderer!;
}

test('renders a full-screen camera viewport with overlaid controls', () => {
  const renderer = renderCamera();
  const viewport = renderer.root.findByProps({accessibilityLabel: '相机画面区域'});
  const style = StyleSheet.flatten(viewport.props.style);

  expect(style.position).toBe('absolute');
  expect(style.top).toBe(0);
  expect(style.bottom).toBe(0);
  expect(style.left).toBe(0);
  expect(style.right).toBe(0);
  expect(style.marginHorizontal).toBeUndefined();
  expect(style.borderWidth).toBeUndefined();
  expect(renderer.root.findAllByType(Svg).length).toBeGreaterThanOrEqual(4);
  expect(renderer.root.findByProps({accessibilityLabel: '拍照'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '从相册导入'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '实时摄像头预览'})).toBeDefined();
});

test('keeps the bottom controls floating away from the screen edges', () => {
  const renderer = renderCamera();
  const controls = renderer.root.findByProps({accessibilityLabel: '拍照'}).parent;
  const style = StyleSheet.flatten(controls.props.style);

  expect(style.left).toBe(14);
  expect(style.right).toBe(14);
  expect(style.bottom).toBe(14);
  expect(style.borderRadius).toBe(26);
});

test('caps camera status text scaling independently from the preview layout', () => {
  const renderer = renderCamera();
  const title = renderer.root.findAll(node => node.props.children === '拍摄文档')[0];
  expect(title.props.maxFontSizeMultiplier).toBe(MAX_TEXT_SCALE);
});

test('does not claim document edges before a real detection event', () => {
  const renderer = renderCamera();
  expect(renderer.root.findAll(node => node.props.children === '已检测到文档边缘')).toHaveLength(0);
  expect(renderer.root.findAll(node => node.props.children === '正在检测文档边缘').length).toBeGreaterThan(0);
});

test('shows detected status only after a valid native detection event', () => {
  const renderer = renderCamera();
  const preview = renderer.root.findByProps({accessibilityLabel: '实时摄像头预览'});

  ReactTestRenderer.act(() => {
    preview.props.onDocumentCorners({
      nativeEvent: {
        corners: {
          topLeft: {x: 0.1, y: 0.1},
          topRight: {x: 0.9, y: 0.1},
          bottomRight: {x: 0.9, y: 0.9},
          bottomLeft: {x: 0.1, y: 0.9},
        },
        source: 'opencv',
        confidence: 0.8,
      },
    });
  });

  expect(renderer.root.findAll(node => node.props.children === '已检测到文档边缘').length).toBeGreaterThan(0);
  ReactTestRenderer.act(() => renderer.unmount());
});

test('expires detected status when no fresh native event arrives', () => {
  jest.useFakeTimers();
  const renderer = renderCamera();
  const preview = renderer.root.findByProps({accessibilityLabel: '实时摄像头预览'});

  ReactTestRenderer.act(() => {
    preview.props.onDocumentCorners({
      nativeEvent: {
        corners: {
          topLeft: {x: 0.1, y: 0.1},
          topRight: {x: 0.9, y: 0.1},
          bottomRight: {x: 0.9, y: 0.9},
          bottomLeft: {x: 0.1, y: 0.9},
        },
        source: 'fairscan',
        confidence: 0.8,
      },
    });
    jest.advanceTimersByTime(1600);
  });

  expect(renderer.root.findAll(node => node.props.children === '已检测到文档边缘')).toHaveLength(0);
  ReactTestRenderer.act(() => renderer.unmount());
  jest.useRealTimers();
});

test('does not treat fallback corners as a real detection', () => {
  const renderer = renderCamera();
  const preview = renderer.root.findByProps({accessibilityLabel: '实时摄像头预览'});

  ReactTestRenderer.act(() => {
    preview.props.onDocumentCorners({
      nativeEvent: {
        corners: {
          topLeft: {x: 0.1, y: 0.1},
          topRight: {x: 0.9, y: 0.1},
          bottomRight: {x: 0.9, y: 0.9},
          bottomLeft: {x: 0.1, y: 0.9},
        },
        source: 'opencv',
        confidence: 0.8,
      },
    });
    preview.props.onDocumentCorners({
      nativeEvent: {
        corners: {
          topLeft: {x: 0.08, y: 0.08},
          topRight: {x: 0.92, y: 0.08},
          bottomRight: {x: 0.92, y: 0.92},
          bottomLeft: {x: 0.08, y: 0.92},
        },
        source: 'fallback',
        confidence: 0.2,
      },
    });
  });

  expect(renderer.root.findAll(node => node.props.children === '已检测到文档边缘')).toHaveLength(0);
});

test('forwards camera actions and toggles flash state', () => {
  const onBack = jest.fn();
  const onCapture = jest.fn();
  const onImport = jest.fn();
  const onPermission = jest.fn();
  const onFlashToggle = jest.fn();
  const renderer = renderCamera({onBack, onCapture, onImport, onPermission, onFlashToggle});

  ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: '返回首页'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '拍照'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '从相册导入'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '打开权限设置'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '切换闪光灯'}).props.onPress();
  });

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onCapture).toHaveBeenCalledTimes(1);
  expect(onImport).toHaveBeenCalledTimes(1);
  expect(onPermission).toHaveBeenCalledTimes(1);
  expect(onFlashToggle).toHaveBeenCalledWith(true);
  expect(renderer.root.findByProps({accessibilityLabel: '切换闪光灯'}).props.accessibilityState.checked).toBe(true);
});

test('disables capture while processing without exposing temporary-photo recovery', () => {
  const onCapture = jest.fn();
  const renderer = renderCamera({
    isProcessing: true,
    onCapture,
    processingLabel: '正在保存照片',
  });
  const capture = renderer.root.findByProps({accessibilityLabel: '拍照'});
  const buttonLabels = renderer.root
    .findAll(node => node.props.accessibilityRole === 'button')
    .map(node => node.props.accessibilityLabel)
    .filter(Boolean);

  expect(capture.props.accessibilityState).toEqual({busy: true, disabled: true});
  expect(buttonLabels).toEqual(expect.arrayContaining(['返回首页', '切换闪光灯', '从相册导入', '拍照', '打开权限设置']));
  expect(new Set(buttonLabels)).toEqual(new Set(['返回首页', '切换闪光灯', '从相册导入', '拍照', '打开权限设置']));
  ReactTestRenderer.act(() => {
    capture.props.onPress();
  });
  expect(onCapture).not.toHaveBeenCalled();
  expect(renderer.root.findAll(node => node.props.children === '正在保存照片').length).toBeGreaterThan(0);
});

test('shows permission and camera error feedback without hiding the viewport', () => {
  const renderer = renderCamera({cameraError: '相机启动失败', permissionDenied: true});
  expect(renderer.root.findByProps({accessibilityLabel: '相机画面区域'})).toBeDefined();
  expect(renderer.root.findAll(node => node.props.children === '相机启动失败').length).toBeGreaterThan(0);
  expect(renderer.root.findAll(node => node.props.children === '相机权限已拒绝').length).toBeGreaterThan(0);
});

test('covers the native preview with an opaque shield while processing', () => {
  const renderer = renderCamera({isProcessing: true});
  const shade = renderer.root.findByProps({testID: 'camera-processing-shade'});
  expect(StyleSheet.flatten(shade.props.style)).toEqual(
    expect.objectContaining({backgroundColor: theme.colors.darkWorkspace, opacity: 1}),
  );
});
