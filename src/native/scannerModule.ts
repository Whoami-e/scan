/**
 * RN 与原生扫描能力之间的类型化接口。
 *
 * PRD 已明确：相机、边缘识别、透视矫正、图像增强和 PDF 生成放在原生层。
 * 因此这里不实现图像算法，只定义 JS 层调用时需要的输入和输出。
 *
 * 未来 Android 侧可以通过 NativeModules 暴露同名模块；iOS 扩展时保持这些
 * 方法的语义不变，只替换平台实现，页面和业务模型就不需要绑定 Android 细节。
 */

import {NativeModules, Platform} from 'react-native';

import {DocumentCorners, EnhanceMode} from '../data/models';

export interface EdgeDetectionResult {
  corners: DocumentCorners;
  confidence: number;
}

export interface PdfOptions {
  pageSize: 'A4';
  marginMillimeters: number;
}

export interface ScannerModule {
  detectDocumentEdges(imagePath: string): Promise<EdgeDetectionResult>;
  cropAndWarp(
    imagePath: string,
    corners: DocumentCorners,
  ): Promise<{processedImagePath: string}>;
  enhanceImage(
    imagePath: string,
    mode: EnhanceMode,
  ): Promise<{processedImagePath: string}>;
  createPdf(
    pageImagePaths: string[],
    outputName: string,
    options: PdfOptions,
  ): Promise<{pdfPath: string}>;
  shareFile(filePath: string): Promise<void>;
  openFile(filePath: string): Promise<void>;
  exportLogs(): Promise<{logFilePath: string}>;
}

const nativeScanner = NativeModules.ScannerModule as
  | Partial<ScannerModule>
  | undefined;

function unavailable(methodName: string): never {
  throw new Error(
    `${methodName} 尚未接入原生扫描模块（当前平台：${Platform.OS}）`,
  );
}

/**
 * 暂时的安全占位对象。
 *
 * 这里宁愿明确抛出“未接入”，也不返回假的图片路径或 PDF 路径。这样后续写页面
 * 时可以提前覆盖错误状态，避免把原生模块缺失伪装成业务成功。
 */
export const scannerModule: ScannerModule = {
  detectDocumentEdges: imagePath =>
    nativeScanner?.detectDocumentEdges?.(imagePath) ??
    Promise.reject(unavailable('detectDocumentEdges')),

  cropAndWarp: (imagePath, corners) =>
    nativeScanner?.cropAndWarp?.(imagePath, corners) ??
    Promise.reject(unavailable('cropAndWarp')),

  enhanceImage: (imagePath, mode) =>
    nativeScanner?.enhanceImage?.(imagePath, mode) ??
    Promise.reject(unavailable('enhanceImage')),

  createPdf: (pageImagePaths, outputName, options) =>
    nativeScanner?.createPdf?.(pageImagePaths, outputName, options) ??
    Promise.reject(unavailable('createPdf')),

  shareFile: filePath =>
    nativeScanner?.shareFile?.(filePath) ??
    Promise.reject(unavailable('shareFile')),

  openFile: filePath =>
    nativeScanner?.openFile?.(filePath) ??
    Promise.reject(unavailable('openFile')),

  exportLogs: () =>
    nativeScanner?.exportLogs?.() ??
    Promise.reject(unavailable('exportLogs')),
};
