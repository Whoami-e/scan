# Photo Logic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 UX Mini Spec 将照片扫描链路实现为可恢复的 RN 状态流，并逐步接通 Android 原生处理能力。

**Architecture:** RN 层维护当前扫描会话、待处理图片队列和本地文档模型；页面只消费明确的回调和稳定路径。Android `ScannerModule` 负责拍照、边缘检测、透视裁剪、增强、PDF、预览与分享，任何原生失败都通过可识别错误返回。图片处理始终以原图路径、四角坐标、旋转角度和增强模式为输入，避免重复处理。

**Tech Stack:** React Native 0.87.1、TypeScript、react-native-paper、react-native-svg、Android Camera2/Kotlin、Jest。

**Spec:** `docs/design/UX-UI-Mini-Spec.v2026-08-28.md` and `docs/requirements/PRD.v2026-08-28.md`

## Global Constraints

- Android MVP 最低建议 Android 10 / API 29+。
- 图片、PDF 和工程数据默认写入 App 沙盒，不上传文档内容。
- 相册多选最多 20 张，按选择顺序逐页确认。
- 自动检测只做辅助提示，失败时仍允许手动调整。
- 所有图标使用 SVG，不使用文本符号替代图标。
- 重新编辑必须基于原图重新生成处理图。

### Task 1: Photo acquisition session

**Files:** `src/app/App.tsx`, `src/native/mediaPicker.ts`, `src/data/models.ts`, `android/app/src/main/java/com/scanapp/ScannerCameraView.kt`, `__tests__/AppCameraFlow.test.tsx`

- [ ] 建立 `ScanSession` 类型，包含临时原图、队列、当前文档和恢复标记。
- [ ] 统一相机与相册结果为 `{cancelled,imagePaths,error}`，保留 URI 顺序并过滤空值。
- [ ] 拍照成功后将原图放入临时会话，失败时保留拍摄页和错误状态。
- [ ] Android 相机捕获完整 JPEG 到 cache，而不是仅保存预览帧。
- [ ] 增加多选队列与临时照片恢复测试。

### Task 2: Crop review

**Files:** `src/screens/CropScreen.tsx`, `src/app/App.tsx`, `__tests__/CropScreen.test.tsx`

- [ ] 使用 SVG 返回、重检和四角视觉控件，四角触控热区不小于 44x44。
- [ ] 接收原图尺寸和检测角点，支持拖动、重新检测、重拍与确认。
- [ ] 确认时调用 `scannerModule.cropAndWarp`，输出处理图路径并进入增强页。

### Task 3: Enhance and page commit

**Files:** `src/screens/EnhanceScreen.tsx`, `src/app/App.tsx`, `src/data/models.ts`, tests

- [ ] 预览图绑定当前处理路径，模式切换调用 `enhanceImage(originalPath, mode)`。
- [ ] 旋转只更新页面元数据，重新裁剪回到裁剪页并保留原图。
- [ ] 加入文档时创建 `ScanPage`，按队列继续下一张或进入多页页。

### Task 4: Pages document session

**Files:** `src/screens/PagesScreen.tsx`, `src/app/App.tsx`, tests

- [ ] 管理页面缩略图、页序、删除、上下移动、重新编辑和继续扫描。
- [ ] 所有编辑操作更新 `Document.updatedAt/status`。

### Task 5: PDF export

**Files:** `src/screens/ExportScreen.tsx`, `src/app/App.tsx`, `src/native/scannerModule.ts`, Android module, tests

- [ ] 校验文件名并处理 `.pdf` 后缀。
- [ ] 同名时提供覆盖或自动追加序号。
- [ ] 调用 `createPdf` 生成 A4/10mm 白边 PDF，成功后支持预览与系统分享。

### Task 6: Persistence and home/settings

**Files:** `src/data/fileStore.ts`, `src/screens/HomeScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/app/App.tsx`, tests

- [ ] 持久化文档索引和页面元数据，首页按最近更新时间倒序显示。
- [ ] 删除文档时清理工程资源，资源缺失时保留条目并提供提示。
- [ ] 设置页导出脱敏日志并展示本地保存说明。

### Task 7: Verification

- [ ] 运行 `npm test -- --runInBand`。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `node prototype/interactive/scan-ux/prototype.test.js`。
- [ ] 在可用 Android 环境验证拍照、相册多选、裁剪、增强、多页和导出主路径。
