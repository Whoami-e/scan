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
}

/**
 * 工程骨架阶段的占位实现。
 *
 * 先明确“未接入”而不是静默伪造成功，防止页面在原生能力尚未完成时误以为
 * 图片真的已经保存。M3 接入真实沙盒存储后，替换这个对象即可。
 */
export const fileStore: FileStore = {
  async createWorkspace(): Promise<string> {
    throw new Error('fileStore 尚未接入 App 沙盒文件系统');
  },

  async deleteWorkspace(): Promise<void> {
    throw new Error('fileStore 尚未接入 App 沙盒文件系统');
  },

  async removeFile(): Promise<void> {
    throw new Error('fileStore 尚未接入 App 沙盒文件系统');
  },
};
