import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Button, IconButton} from 'react-native-paper';
import {Image, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import CropScreen from '../src/screens/CropScreen';
import {MAX_CONTROL_TEXT_SCALE} from '../src/theme/responsive';

function renderCrop(props: React.ComponentProps<typeof CropScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<CropScreen {...props} />);
  });
  return renderer!;
}

test('shows crop landmarks and four accessible corner controls', () => {
  const renderer = renderCrop();
  const text = renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => String(node.props.children));

  expect(text).toEqual(expect.arrayContaining(['调整边缘', '拖动四角后确认裁剪', '重拍', '确认裁剪']));
  expect(text).not.toContain('重新检测');
  expect(renderer.root.findByProps({accessibilityLabel: '返回拍摄'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '重新检测边缘'})).toBeDefined();
  expect(renderer.root.findAllByType(IconButton)).toHaveLength(2);
  expect(renderer.root.findAllByType(Button)).toHaveLength(2);
  expect(renderer.root.findByProps({accessibilityLabel: '左上角控制点'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '右上角控制点'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '右下角控制点'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '左下角控制点'})).toBeDefined();
});

test('notifies parent when crop actions are pressed', () => {
  const onBack = jest.fn();
  const onRetake = jest.fn();
  const onConfirm = jest.fn();
  const onRedetect = jest.fn();
  const renderer = renderCrop({onBack, onRetake, onConfirm, onRedetect});

  ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: '返回拍摄'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '重新检测边缘'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '重拍'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '确认裁剪'}).props.onPress();
  });

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onRedetect).toHaveBeenCalledTimes(1);
  expect(onRetake).toHaveBeenCalledTimes(1);
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onConfirm.mock.calls[0][0]).toMatchObject({
    tl: {x: 0.13, y: 0.1},
    tr: {x: 0.86, y: 0.14},
  });
});

test('uses the captured image as the crop canvas source', () => {
  const renderer = renderCrop({imagePath: 'file:///tmp/captured.jpg'});
  const image = renderer.root.findByProps({accessibilityLabel: '待裁剪照片'});
  expect(image.type).toBe(Image);
  expect(image.props.source).toEqual({uri: 'file:///tmp/captured.jpg'});
});

test('shows a wide imported image in full at its original aspect ratio', () => {
  const renderer = renderCrop({imagePath: 'content://gallery/wide-photo'});
  const image = renderer.root.findByProps({accessibilityLabel: '待裁剪照片'});

  expect(image.props.onLoad).toEqual(expect.any(Function));
  ReactTestRenderer.act(() => {
    image.props.onLoad({nativeEvent: {source: {width: 2400, height: 1000}}});
  });

  expect(image.props.resizeMode).toBe('contain');
  const frame = renderer.root.findByProps({testID: 'crop-frame'});
  const frameStyle = Array.isArray(frame.props.style)
    ? Object.assign({}, ...frame.props.style)
    : frame.props.style;
  expect(frameStyle.aspectRatio).toBe(2.4);
});

test.each(['fairscan', 'opencv'] as const)('does not warn for %s detections', source => {
  const renderer = renderCrop({detectionSource: source, detectionConfidence: 0.8});
  expect(renderer.root.findAllByProps({accessibilityLabel: '低置信度提示'})).toHaveLength(0);
});

test('warns only for the low confidence fallback', () => {
  const renderer = renderCrop({detectionSource: 'fallback', detectionConfidence: 0.2});
  expect(renderer.root.findByProps({accessibilityLabel: '低置信度提示'}).props.children).toBe('请手动确认裁剪范围');
});

test('uses an SVG icon for redetect and does not render document guide lines', () => {
  const renderer = renderCrop();
  const redetect = renderer.root.findByProps({accessibilityLabel: '重新检测边缘'});
  const icon = redetect.findByType(Svg);
  expect(icon.props.width).toBe(21);
  expect(icon.props.height).toBe(21);
  expect(icon.findByType(Path).props.d).toBe(
    'M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2M18 2v4h-4M6 22v-4h4',
  );
  expect(icon.findByType(Path).props.strokeWidth).toBe(1.8);
  const guideLines = renderer.root.findAll(node => {
    const style = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style;
    return style?.backgroundColor === '#D8D8DF' || style?.backgroundColor === '#D7E4F0';
  });
  expect(guideLines).toHaveLength(0);
});

test('gives both crop action buttons a shadow', () => {
  const renderer = renderCrop();
  const retakeShadow = renderer.root.findByProps({testID: 'button-shadow-retake'});
  const confirmShadow = renderer.root.findByProps({testID: 'button-shadow-confirm'});
  const retakeStyle = Array.isArray(retakeShadow.props.style)
    ? Object.assign({}, ...retakeShadow.props.style)
    : retakeShadow.props.style;
  const confirmStyle = Array.isArray(confirmShadow.props.style)
    ? Object.assign({}, ...confirmShadow.props.style)
    : confirmShadow.props.style;
  expect(retakeStyle).toEqual(expect.objectContaining({position: 'relative'}));
  expect(confirmStyle).toEqual(expect.objectContaining({position: 'relative'}));
  const retakeLayer = renderer.root.findByProps({testID: 'button-shadow-layer-retake'});
  const confirmLayer = renderer.root.findByProps({testID: 'button-shadow-layer-confirm'});
  expect(retakeLayer.props.style).toEqual(expect.objectContaining({left: 4, top: 4}));
  expect(confirmLayer.props.style).toEqual(expect.objectContaining({left: 4, top: 4}));
});

test('caps crop action label scaling to keep both buttons usable', () => {
  const renderer = renderCrop();
  expect(renderer.root.findAllByType(Button).map(button => button.props.maxFontSizeMultiplier)).toEqual([
    MAX_CONTROL_TEXT_SCALE,
    MAX_CONTROL_TEXT_SCALE,
  ]);
});

test('centers the crop buttons vertically in the bottom action bar', () => {
  const renderer = renderCrop();
  const actionBar = renderer.root.findByProps({testID: 'crop-actions'});
  const style = Array.isArray(actionBar.props.style)
    ? Object.assign({}, ...actionBar.props.style)
    : actionBar.props.style;
  expect(style).toEqual(expect.objectContaining({alignItems: 'center'}));
});

test('updates a corner when its handle is dragged', () => {
  const renderer = renderCrop();
  const frame = renderer.root.findByProps({testID: 'crop-frame'});
  ReactTestRenderer.act(() => {
    frame.props.onLayout({nativeEvent: {layout: {width: 300, height: 500}}});
  });

  const handle = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const touchEvent = (x: number, y: number, timestamp: number) => ({
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX: x,
          currentPageY: y,
          currentTimeStamp: timestamp,
          previousPageX: 0,
          previousPageY: 0,
          touchActive: true,
        },
      ],
    },
  });
  ReactTestRenderer.act(() => {
    handle.props.onResponderGrant(touchEvent(0, 0, 1));
    handle.props.onResponderMove(touchEvent(30, 50, 2));
  });

  const updatedHandle = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const handleStyle = Array.isArray(updatedHandle.props.style)
    ? Object.assign({}, ...updatedHandle.props.style)
    : updatedHandle.props.style;
  expect(handleStyle.left).toBe('23%');
  expect(handleStyle.top).toBe('20%');
});

test('keeps a valid corner when an opposite-edge drag would self-intersect', () => {
  const renderer = renderCrop();
  const frame = renderer.root.findByProps({testID: 'crop-frame'});
  ReactTestRenderer.act(() => {
    frame.props.onLayout({nativeEvent: {layout: {width: 300, height: 500}}});
  });

  const handle = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const touchEvent = (dx: number, dy: number, timestamp: number) => ({
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX: dx,
          currentPageY: dy,
          currentTimeStamp: timestamp,
          previousPageX: 0,
          previousPageY: 0,
          touchActive: true,
        },
      ],
    },
  });

  ReactTestRenderer.act(() => {
    handle.props.onResponderGrant(touchEvent(0, 0, 1));
    handle.props.onResponderMove(touchEvent(-100, -100, 2));
  });
  const topLeftAtEdge = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const edgeStyle = Array.isArray(topLeftAtEdge.props.style)
    ? Object.assign({}, ...topLeftAtEdge.props.style)
    : topLeftAtEdge.props.style;
  expect(edgeStyle.left).toBe('0%');
  expect(edgeStyle.top).toBe('0%');

  ReactTestRenderer.act(() => {
    topLeftAtEdge.props.onResponderGrant(touchEvent(0, 0, 3));
    topLeftAtEdge.props.onResponderMove(touchEvent(500, 500, 4));
  });
  const topLeftAtOppositeEdge = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const oppositeEdgeStyle = Array.isArray(topLeftAtOppositeEdge.props.style)
    ? Object.assign({}, ...topLeftAtOppositeEdge.props.style)
    : topLeftAtOppositeEdge.props.style;
  expect(oppositeEdgeStyle.left).toBe('0%');
  expect(oppositeEdgeStyle.top).toBe('0%');
});

test('rejects a drag that would reverse the crop polygon direction', () => {
  const renderer = renderCrop();
  const frame = renderer.root.findByProps({testID: 'crop-frame'});
  ReactTestRenderer.act(() => {
    frame.props.onLayout({nativeEvent: {layout: {width: 300, height: 500}}});
  });

  const topRight = renderer.root.findByProps({accessibilityLabel: '右上角控制点'});
  const touchEvent = (x: number, y: number, timestamp: number) => ({
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: timestamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX: x,
          currentPageY: y,
          currentTimeStamp: timestamp,
          previousPageX: 0,
          previousPageY: 0,
          touchActive: true,
        },
      ],
    },
  });
  ReactTestRenderer.act(() => {
    topRight.props.onResponderGrant(touchEvent(0, 0, 1));
    topRight.props.onResponderMove(touchEvent(-240, 420, 2));
  });

  const updatedTopRight = renderer.root.findByProps({accessibilityLabel: '右上角控制点'});
  const style = Array.isArray(updatedTopRight.props.style)
    ? Object.assign({}, ...updatedTopRight.props.style)
    : updatedTopRight.props.style;
  expect(Number.parseFloat(style.left)).toBeCloseTo(86, 5);
  expect(Number.parseFloat(style.top)).toBeCloseTo(14, 5);
});

test('keeps corner responders stable while layout state changes', () => {
  const renderer = renderCrop();
  const handleBeforeLayout = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const moveHandler = handleBeforeLayout.props.onResponderMove;
  const frame = renderer.root.findByProps({testID: 'crop-frame'});

  ReactTestRenderer.act(() => {
    frame.props.onLayout({nativeEvent: {layout: {width: 300, height: 500}}});
  });

  const handleAfterLayout = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  expect(handleAfterLayout.props.onResponderMove).toBe(moveHandler);
});

test('uses the larger crop frame proportions from the UX', () => {
  const renderer = renderCrop();
  const frame = renderer.root.findByProps({testID: 'crop-frame'});
  expect(frame.props.style).toEqual(expect.objectContaining({aspectRatio: 0.6, width: '94%', maxWidth: 360}));
  const canvas = renderer.root.findByProps({testID: 'crop-canvas'});
  expect(canvas.props.style).toEqual(expect.objectContaining({paddingBottom: 90, paddingTop: 14}));
});

test('captures touch gestures at the crop handles', () => {
  const renderer = renderCrop();
  const handle = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const event = {
    nativeEvent: {touches: [{}]},
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: 1,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX: 0,
          currentPageY: 0,
          currentTimeStamp: 1,
          previousPageX: 0,
          previousPageY: 0,
          touchActive: true,
        },
      ],
    },
  };
  expect(handle.props.onStartShouldSetResponderCapture(event)).toBe(true);
  expect(handle.props.onMoveShouldSetResponderCapture(event)).toBe(true);
});

test('uses a non-pressable gesture node for each crop handle', () => {
  const renderer = renderCrop();
  const handle = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  expect(handle.type).toBe(View);
});

test('keeps crop handles compact while retaining a generous touch target', () => {
  const renderer = renderCrop();
  const handle = renderer.root.findByProps({accessibilityLabel: '左上角控制点'});
  const handleStyle = Array.isArray(handle.props.style)
    ? Object.assign({}, ...handle.props.style)
    : handle.props.style;
  const core = handle.findAllByType(View).find(node => node !== handle)!;
  const coreStyle = Array.isArray(core.props.style)
    ? Object.assign({}, ...core.props.style)
    : core.props.style;

  expect(handleStyle.width).toBe(48);
  expect(handleStyle.height).toBe(48);
  expect(coreStyle.width).toBe(28);
  expect(coreStyle.height).toBe(28);
  expect(handle.props.hitSlop).toBe(12);
});
