import React from 'react';
import {ScrollView} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {Button} from 'react-native-paper';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({bottom: 0, left: 0, right: 0, top: 0}),
}));

import PrimaryButton from '../src/components/PrimaryButton';
import ExportScreen from '../src/screens/ExportScreen';
import SettingsScreen from '../src/screens/SettingsScreen';
import {MAX_CONTROL_TEXT_SCALE} from '../src/theme/responsive';

function render(element: React.ReactElement): ReactTestRenderer.ReactTestRenderer {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(element);
  });
  return renderer!;
}

test('caps primary button label scaling so text cannot cover the control', () => {
  const renderer = render(<PrimaryButton label="扫描" onPress={() => undefined} />);

  expect(renderer.root.findByType(Button).props.maxFontSizeMultiplier).toBe(
    MAX_CONTROL_TEXT_SCALE,
  );
});

test('keeps settings and export content reachable on short screens', () => {
  const settings = render(<SettingsScreen />);
  const exportPage = render(<ExportScreen pageCount={1} />);

  expect(settings.root.findAllByType(ScrollView)).toHaveLength(1);
  expect(exportPage.root.findAllByType(ScrollView)).toHaveLength(1);
});
