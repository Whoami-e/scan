import {getPageCardWidth, getResponsiveMetrics} from '../src/theme/responsive';

test('uses compact metrics for narrow phones without enlarging typography', () => {
  const metrics = getResponsiveMetrics(320, 568);

  expect(metrics.isCompact).toBe(true);
  expect(metrics.horizontalInset).toBe(16);
  expect(metrics.contentGap).toBe(12);
  expect(metrics.titleSize).toBe(22);
  expect(metrics.titleLineHeight).toBe(28);
  expect(metrics.bodySize).toBe(16);
  expect(metrics.bottomActionDirection).toBe('column');
});

test('uses regular metrics for standard phones', () => {
  const metrics = getResponsiveMetrics(393, 852);

  expect(metrics.isCompact).toBe(false);
  expect(metrics.horizontalInset).toBe(20);
  expect(metrics.contentGap).toBe(16);
  expect(metrics.titleSize).toBe(24);
  expect(metrics.titleLineHeight).toBe(30);
  expect(metrics.bodySize).toBe(16);
  expect(metrics.bottomActionDirection).toBe('row');
});

test('fits two equal page cards inside the available phone width', () => {
  expect(getPageCardWidth(320, 16, 12)).toBe(138);
  expect(getPageCardWidth(393, 20, 16)).toBe(168.5);
});
