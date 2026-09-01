import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {IconButton} from 'react-native-paper';
import Svg from 'react-native-svg';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import SettingsScreen from '../src/screens/SettingsScreen';

function renderSettings(props: React.ComponentProps<typeof SettingsScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<SettingsScreen {...props} />);
  });
  return renderer!;
}

test('renders the PRD settings landmarks and excludes non-MVP entries', () => {
  const renderer = renderSettings();
  const text = renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => String(node.props.children));

  expect(text).toEqual(
    expect.arrayContaining([
      '设置',
      '本地保存',
      '扫描工程和 PDF 默认保存在 App 沙盒内。',
      '卸载提醒',
      '卸载 App 会删除沙盒内文件，重要 PDF 请先分享转存。',
      '本地日志',
      '仅由你主动导出，不包含文档标题、路径或图片内容。',
      '版本',
      '原型对应 PRD v2026-08-27.1',
      'MVP',
    ]),
  );
  expect(text.join('')).not.toMatch(/登录|云同步|会员|主题/);
  expect(renderer.root.findAllByType(IconButton)).toHaveLength(2);
});

test('delegates back and log export actions', () => {
  const onBack = jest.fn();
  const onExportLogs = jest.fn();
  const renderer = renderSettings({onBack, onExportLogs});

  ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: '返回首页'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '导出日志'}).props.onPress();
  });

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onExportLogs).toHaveBeenCalledTimes(1);
});

test('uses an SVG download icon for log export', () => {
  const renderer = renderSettings();
  const logButton = renderer.root.findByProps({accessibilityLabel: '导出日志'});
  const icon = logButton.props.icon({color: '#211D46', size: 22});

  expect(icon.type).toBe(Svg);
});

test('exposes hover and pressed handlers for all setting rows', () => {
  const renderer = renderSettings();
  const rows = renderer.root.findAll(node => typeof node.props.onHoverIn === 'function');
  const settingRows = rows.filter(node => typeof node.props.onPressOut === 'function');

  expect(settingRows.length).toBeGreaterThanOrEqual(4);
});
