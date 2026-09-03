import {NativeModules} from 'react-native';

/**
 * App 沙盒文件存储的接口占位。
 *
 * 当前只定义契约，不急着把具体文件操作写进 RN 页面。正式实现时应保证：
 * - 所有图片、PDF 和中间文件默认写入 App 沙盒。
 * - 删除扫描工程时清理关联资源。
 * - 导出 PDF 成功后不能删除仍可编辑的扫描工程。
 * - 文件操作失败时返回可识别错误，让页面展示重试或恢复入口。
 */

export interface FileStore {
  createWorkspace(documentId: string): Promise<string>;
  deleteWorkspace(documentId: string): Promise<void>;
  removeFile(filePath: string): Promise<void>;
  saveDocument(documentId: string, serialized: string): Promise<void>;
  loadDocuments(): Promise<string[]>;
  deleteDocument(documentId: string): Promise<void>;
  savePageImage(documentId: string, pageId: string, imagePath: string, kind: 'original' | 'processed'): Promise<string>;
}

/**
 * 通过 ScannerModule 访问 Android 沙盒文件工作区。
 *
 * 这里保留薄适配层，页面不直接依赖 NativeModules，也不持有文件生命周期。
 */
export const fileStore: FileStore = {
  async createWorkspace(documentId): Promise<string> {
    const create = NativeModules.ScannerModule?.createWorkspace as ((id: string) => Promise<string>) | undefined;
    if (!create) throw new Error('fileStore 尚未接入 App 沙盒文件系统');
    return create(documentId);
  },

  async deleteWorkspace(documentId): Promise<void> {
    const remove = NativeModules.ScannerModule?.deleteWorkspace as ((id: string) => Promise<void>) | undefined;
    if (!remove) throw new Error('fileStore 尚未接入 App 沙盒文件系统');
    await remove(documentId);
  },

  async removeFile(filePath): Promise<void> {
    const remove = NativeModules.ScannerModule?.removeFile as ((path: string) => Promise<void>) | undefined;
    if (!remove) throw new Error('fileStore 尚未接入 App 沙盒文件系统');
    await remove(filePath);
  },

  async saveDocument(documentId, serialized): Promise<void> {
    const save = NativeModules.ScannerModule?.saveDocument as ((id: string, value: string) => Promise<void>) | undefined;
    if (!save) throw new Error('fileStore 尚未接入 App 沙盒文件系统');
    await save(documentId, serialized);
  },

  async loadDocuments(): Promise<string[]> {
    const load = NativeModules.ScannerModule?.loadDocuments as (() => Promise<string[]>) | undefined;
    if (!load) throw new Error('fileStore 尚未接入 App 沙盒文件系统');
    return load();
  },

  async deleteDocument(documentId): Promise<void> {
    const remove = NativeModules.ScannerModule?.deleteDocument as ((id: string) => Promise<void>) | undefined;
    if (!remove) throw new Error('fileStore 尚未接入 App 沙盒文件系统');
    await remove(documentId);
  },

  async savePageImage(documentId, pageId, imagePath, kind): Promise<string> {
    const save = NativeModules.ScannerModule?.savePageImage as ((docId: string, pageId: string, path: string, kind: string) => Promise<string>) | undefined;
    if (!save) throw new Error('fileStore 尚未接入 App 沙盒文件系统');
    return save(documentId, pageId, imagePath, kind);
  },
};
