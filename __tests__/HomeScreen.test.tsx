import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Button, IconButton, Surface} from 'react-native-paper';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import HomeScreen from '../src/screens/HomeScreen';
import Svg from 'react-native-svg';

function renderHome(props: React.ComponentProps<typeof HomeScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<HomeScreen {...props} />);
  });
  return renderer!;
}

test('matches the reference home landmarks', () => {
  const renderer = renderHome();
  const text = renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => String(node.props.children));

  expect(text).toEqual(
    expect.arrayContaining([
      '文档',
      '最近更新的扫描工程',
      '暂无文档',
      '点按下方按钮开始扫描。',
      '扫描',
    ]),
  );

  expect(
    renderer.root.findByProps({accessibilityLabel: '进入设置'}),
  ).toBeDefined();
  expect(
    renderer.root.findByProps({accessibilityLabel: '扫描'}),
  ).toBeDefined();
  expect(renderer.root.findAllByType(Surface).length).toBeGreaterThanOrEqual(1);
  expect(renderer.root.findAllByType(IconButton)).toHaveLength(1);
  expect(renderer.root.findAllByType(Button)).toHaveLength(1);
});

test('delegates scan and settings actions to the parent', () => {
  const onStartScan = jest.fn();
  const onSettings = jest.fn();
  const renderer = renderHome({onStartScan, onSettings});

  ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: '进入设置'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '扫描'}).props.onPress();
  });

  expect(onSettings).toHaveBeenCalledTimes(1);
  expect(onStartScan).toHaveBeenCalledTimes(1);
});

test('renders the scan action with an SVG icon sized by the button', () => {
  const renderer = renderHome();
  const scanButton = renderer.root.findByProps({accessibilityLabel: '扫描'});
  const icon = scanButton.props.icon({color: '#fff', size: 30});

  expect(icon.type).toBe(Svg);
  expect(icon.props.width).toBe(30);
  expect(icon.props.height).toBe(30);
});

test('renders the settings action with an SVG icon', () => {
  const renderer = renderHome();
  const settingsButton = renderer.root.findByProps({accessibilityLabel: '进入设置'});
  const icon = settingsButton.props.icon({color: '#21183f', size: 22});

  expect(icon.type).toBe(Svg);
  expect(icon.props.viewBox).toBe('0 0 24 24');
  const paths = React.Children.toArray(icon.props.children) as React.ReactElement[];
  expect(paths.some(path => String(path.props.d).includes('M19.4'))).toBe(true);
});

test('uses an open scan-frame SVG instead of a cramped square', () => {
  const renderer = renderHome();
  const scanButton = renderer.root.findByProps({accessibilityLabel: '扫描'});
  const icon = scanButton.props.icon({color: '#fff', size: 20});
  const paths = React.Children.toArray(icon.props.children) as React.ReactElement[];

  expect(paths.some(path => String(path.props.d).includes('M4 8V6'))).toBe(true);
});
