/**
 * 主题对象的统一出口。
 *
 * 现在先用一个轻量对象满足页面骨架的需要。后续如果引入组件库或设计 Token
 * 生成工具，只需要替换这个出口，页面不必逐个修改颜色和间距来源。
 */

import {colors, radii, spacing, typography} from './tokens';
import {MD3LightTheme} from 'react-native-paper';

export const theme = {
  colors,
  spacing,
  radii,
  typography,
} as const;

export const paperTheme = {
  ...MD3LightTheme,
  roundness: radii.md,
  colors: {
    ...MD3LightTheme.colors,
    background: colors.surfaceDefault,
    onPrimary: colors.surfaceDefault,
    onPrimaryContainer: colors.inkPrimary,
    onSurface: colors.inkPrimary,
    onSurfaceVariant: colors.inkSecondary,
    outline: colors.inkPrimary,
    primary: colors.actionPrimary,
    primaryContainer: colors.surfaceWarm,
    surface: colors.surfaceDefault,
    surfaceVariant: colors.surfaceWarm,
  },
} as const;

export type AppTheme = typeof theme;
