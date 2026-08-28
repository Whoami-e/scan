# 文档扫描 App MVP PRD v2026-08-28

## 0. 版本说明

本文档基于 `docs/requirements/PRD.v2026-08-27.1.md`，记录 2026-08-28 的视觉方向决策。

除本文件明确覆盖的内容外，功能范围、数据结构、权限、存储、性能、异常处理和测试要求继续继承上一版 PRD。

## 1. 本版本变化

### 1.1 正式采用 Energetic 视觉方向

MVP 正式采用当前原型 `prototype/visual/prototype_document-scanner-ux-energetic.html` 的 Energetic 视觉，不再采用上一版 PRD 第 10 节中定义的 Apple 风格白灰蓝色方案。

Energetic 视觉关键词：

- 暖黄色画布。
- 橙色主操作。
- 深紫色文字和边界。
- 偏几何的卡片、按钮和状态控件。
- 相机、裁剪、增强页面使用深色沉浸式工作区。
- 文档图片始终是扫描和编辑页面的视觉中心。

### 1.2 当前视觉 Token

| Token | 值 | 角色 |
|---|---|---|
| `color.canvas.warm` | `#FFF8D7` | 页面暖黄色背景 |
| `color.surface.default` | `#FFFFFF` | 白色内容表面 |
| `color.surface.warm` | `#FFEF9F` | 空状态和次级背景 |
| `color.ink.primary` | `#1D1836` | 主文字和深色锚点 |
| `color.ink.secondary` | `#4C426C` | 次级文字和深色表面 |
| `color.text.muted` | `#796F91` | 辅助文字 |
| `color.action.primary` | `#FF6B00` | 主操作、选中和边缘线 |
| `color.success` | `#2E9D57` | 成功状态 |
| `color.warning` | `#FFB020` | 警告状态 |
| `color.danger` | `#E5484D` | 删除和错误 |

### 1.3 视觉落地规则

- 橙色只用于主操作、选中状态、检测边缘和重要反馈。
- 首页、列表、导出和设置使用暖黄色、白色和深紫色层级。
- 拍摄、裁剪和增强页面使用深色背景，突出相机画面或扫描图片。
- 不使用 Apple 蓝色作为主品牌操作色。
- 不使用大面积装饰渐变、营销式 Hero 或复杂背景纹理。
- 所有颜色集中维护为语义 token，页面不得散落硬编码色值。

## 2. 执行优先级

视觉相关内容的当前执行优先级如下：

1. `docs/design/UX-UI-Mini-Spec.v2026-08-28.md`
2. 本文件第 1 节
3. `prototype/visual/prototype_document-scanner-ux-energetic.html`
4. `docs/requirements/PRD.v2026-08-27.1.md` 中未被本版本覆盖的内容

上一版 PRD 中与 Apple 风格白灰蓝色相关的内容仅作为历史记录保留，不再作为 MVP 的实现依据。

## 3. 继承内容

继续继承 `docs/requirements/PRD.v2026-08-27.1.md` 的以下要求：

- Android MVP，最低建议 Android 10 / API 29+。
- React Native 负责页面流程和状态管理。
- Android 原生模块负责相机、边缘识别、透视矫正、图像增强和 PDF 生成。
- 支持单页、多页、相册多选、手动四角调整、滤镜、排序、删除和重新编辑。
- PDF 默认 A4、10mm 白边，并保存在 App 沙盒。
- 导出完成后保留扫描工程，支持打开预览和系统分享。
- 不做 OCR、登录、云同步、会员、远程埋点和远程崩溃上报。
- 日志只能主动导出，且不得包含文档标题、文件名、完整路径、图片内容或 PDF 内容。
- 继续执行原有性能、异常处理、设备覆盖和 MVP 验收要求。

## 4. 关联文档

- [上一版 PRD](/Users/whami/Desktop/code/rn/scan/docs/requirements/PRD.v2026-08-27.1.md)
- [UX + UI Mini Spec](/Users/whami/Desktop/code/rn/scan/docs/design/UX-UI-Mini-Spec.v2026-08-28.md)
- [Energetic 原型](/Users/whami/Desktop/code/rn/scan/prototype/visual/prototype_document-scanner-ux-energetic.html)
