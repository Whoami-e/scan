import {useWindowDimensions} from 'react-native';

export const MAX_TEXT_SCALE = 1.3;
export const MAX_CONTROL_TEXT_SCALE = 1.15;
export const MAX_TITLE_TEXT_SCALE = 1;

export interface ResponsiveMetrics {
  isCompact: boolean;
  horizontalInset: number;
  contentGap: number;
  titleSize: number;
  titleLineHeight: number;
  bodySize: number;
  bottomActionDirection: 'column' | 'row';
}

export function getResponsiveMetrics(width: number, height: number): ResponsiveMetrics {
  const isCompact = width < 360 || height < 700;

  return {
    isCompact,
    horizontalInset: isCompact ? 16 : 20,
    contentGap: isCompact ? 12 : 16,
    titleSize: isCompact ? 22 : 24,
    titleLineHeight: isCompact ? 28 : 30,
    bodySize: 16,
    bottomActionDirection: width < 360 ? 'column' : 'row',
  };
}

export function getPageCardWidth(
  availableWidth: number,
  horizontalInset: number,
  gap: number,
): number {
  return Math.max(0, (availableWidth - horizontalInset * 2 - gap) / 2);
}

export function useResponsiveMetrics(): ResponsiveMetrics {
  const {height, width} = useWindowDimensions();
  return getResponsiveMetrics(width, height);
}
