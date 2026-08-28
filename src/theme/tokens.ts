/**
 * Energetic 视觉方向的基础设计 Token。
 *
 * 页面和组件应该优先引用这里的语义颜色，而不是直接写十六进制颜色。
 * 这样做的目的不是为了抽象而抽象，而是让首页、导出页和后续深色扫描工作区
 * 可以共享同一套视觉语言，同时避免颜色散落在各个页面里难以维护。
 */

export const colors = {
  canvasWarm: '#FFF8D7',
  surfaceDefault: '#FFFFFF',
  surfaceWarm: '#FFEF9F',
  inkPrimary: '#1D1836',
  inkSecondary: '#4C426C',
  textMuted: '#796F91',
  actionPrimary: '#FF6B00',
  actionPressed: '#D95400',
  success: '#2E9D57',
  warning: '#FFB020',
  danger: '#E5484D',
  darkWorkspace: '#17122B',
  darkSurface: '#27233D',
  borderLight: '#E8DEB6',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;

export const typography = {
  title: 30,
  sectionTitle: 20,
  body: 16,
  caption: 13,
  button: 16,
} as const;
