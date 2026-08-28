/**
 * 扫描业务模型的单元测试。
 *
 * 先覆盖不依赖平台的纯 TypeScript 逻辑。原生相机和图像算法接入后，
 * 再分别增加 Android 原生测试和跨层集成测试。
 */

import {createEmptyDocument} from '../../src/data/models';

test('creates an empty draft document with stable defaults', () => {
  const document = createEmptyDocument(
    'document-1',
    '2026-08-28T00:00:00.000Z',
  );

  expect(document.id).toBe('document-1');
  expect(document.title).toBe('未命名文档');
  expect(document.status).toBe('draft');
  expect(document.pages).toEqual([]);
  expect(document.createdAt).toBe(document.updatedAt);
});
