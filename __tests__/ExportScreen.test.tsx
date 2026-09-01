import {nextAvailablePdfName} from '../src/screens/ExportScreen';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Button} from 'react-native-paper';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import ExportScreen from '../src/screens/ExportScreen';

function renderExport(props: React.ComponentProps<typeof ExportScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ExportScreen {...props} pageCount={3} />);
  });
  return renderer!;
}

test('creates a numbered PDF name when the requested name already exists', () => {
  expect(nextAvailablePdfName('报告.pdf', ['报告.pdf', '报告 (1).pdf'])).toBe('报告 (2).pdf');
  expect(nextAvailablePdfName('报告', ['报告.pdf'])).toBe('报告 (1).pdf');
});

test('matches the UX export form landmarks', () => {
  const renderer = renderExport();
  const text = renderer.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => String(node.props.children));

  expect(text).toEqual(
    expect.arrayContaining(['导出 PDF', '默认 A4，保留 10mm 白边', '页面方向', '3 页', '约 2.4 MB']),
  );
  expect(text).not.toContain('保存位置');
  expect(renderer.root.findByProps({accessibilityLabel: '页面方向：自动'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '页面方向：竖版'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '页面方向：横版'})).toBeDefined();
  expect(renderer.root.findByProps({accessibilityLabel: '打开预览'})).toBeDefined();
  expect(renderer.root.findAllByType(Button)).toHaveLength(2);
});

test('selects a PDF orientation and forwards it when exporting', async () => {
  const onExport = jest.fn().mockResolvedValue(undefined);
  const renderer = renderExport({onExport});

  ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: '页面方向：横版'}).props.onPress();
  });
  expect(renderer.root.findByProps({accessibilityLabel: '页面方向：横版'}).props.accessibilityState).toEqual(
    expect.objectContaining({selected: true}),
  );

  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({accessibilityLabel: '导出 PDF'}).props.onPress();
    await Promise.resolve();
  });
  expect(onExport).toHaveBeenCalledWith(expect.stringContaining('.pdf'), 'landscape');
});

test('enables preview and share actions after a successful export', async () => {
  const onExport = jest.fn().mockResolvedValue(undefined);
  const onOpenPreview = jest.fn();
  const onShare = jest.fn();
  const renderer = renderExport({onExport, onOpenPreview, onShare});

  await ReactTestRenderer.act(async () => {
    renderer.root.findByProps({accessibilityLabel: '导出 PDF'}).props.onPress();
    await Promise.resolve();
  });

  ReactTestRenderer.act(() => {
    renderer.root.findByProps({accessibilityLabel: '打开预览'}).props.onPress();
    renderer.root.findByProps({accessibilityLabel: '分享 PDF'}).props.onPress();
  });

  expect(onOpenPreview).toHaveBeenCalledTimes(1);
  expect(onShare).toHaveBeenCalledTimes(1);
});
