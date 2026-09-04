/**
 * 扫描业务的最小数据模型。
 *
 * 这些类型描述“扫描工程”在 RN 层看到的形状，不直接绑定 Android 文件系统。
 * 原图、处理图和 PDF 的真实文件生命周期由 fileStore / 原生模块负责，页面只消费
 * 稳定的路径和状态，避免 UI 代码知道过多平台细节。
 */

export type EnhanceMode = 'original' | 'enhanced' | 'grayscale' | 'blackwhite';

export type DocumentStatus =
  | 'draft'
  | 'processing'
  | 'exported'
  | 'resourceMissing';

export type ImageSource = 'camera' | 'gallery';

export interface Point {
  x: number;
  y: number;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface ScanPage {
  id: string;
  originalImagePath: string;
  processedImagePath?: string;
  thumbnailPath?: string;
  corners?: DocumentCorners;
  rotationDegrees: number;
  enhanceMode: EnhanceMode;
  source: ImageSource;
  createdAt: string;
}

export interface ScanSession {
  document: Document;
  pendingImagePath?: string;
  pendingImageQueue: string[];
}

export interface Document {
  id: string;
  title: string;
  status: DocumentStatus;
  pages: ScanPage[];
  pdfPath?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 创建一个空的扫描工程。
 *
 * 时间由调用方传入，方便测试固定时间，也避免模型层隐式依赖系统时钟。
 */
export function createEmptyDocument(
  id: string,
  now: string,
  title = '未命名文档',
): Document {
  return {
    id,
    title,
    status: 'draft',
    pages: [],
    createdAt: now,
    updatedAt: now,
  };
}
