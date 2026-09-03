# FairScan 扫描核心直接移植实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保持现有 React Native 页面流程、Camera2 相机实现、`ScannerModule` 语义和 PRD 的 PDF/隐私约束前提下，直接移植 FairScan v2.2.0 的文档分割、四边形检测、实时稳定和 Retinex 图像增强核心，形成“FairScan 优先，现有 OpenCV 与保守 fallback 兜底”的 Android 扫描管线。

**Architecture:** RN 仍只拥有导航、编辑状态和扫描工程模型；Android 在 `com.scanapp.fairscan` 内保存可追溯的 FairScan 上游快照，在适配层将其 `Quad`、mask、推理结果转换成现有 `ScanQuad` 和 JS `DocumentCorners`。`DocumentDetector` 负责编排：已安装且可用的 LiteRT 模型 -> FairScan mask/quad 检测 -> 现有 OpenCV 轮廓检测 -> 低置信度边距 fallback。拍摄预览继续使用 Camera2，后台节流分析只更新稳定后的四角；拍照后在后台执行完整分割、裁剪和增强。PDF 继续使用 Android `PdfDocument`，不迁移 FairScan 的 PDFBox/OCR 链路。

**Tech Stack:** React Native 0.87、TypeScript、Kotlin、Android API 29+、现有 Camera2/OpenCV Android、LiteRT/TensorFlow Lite、FairScan v2.2.0（commit `2297341`）、JUnit、Android instrumented tests、Jest。

**Spec:** `docs/requirements/PRD.v2026-08-28.md`、`docs/requirements/PRD.v2026-08-27.1.md`、`docs/design/UX-UI-Mini-Spec.v2026-08-28.md`、`docs/superpowers/plans/2026-09-02-makeacopy-integration.md`。

## 上游快照与项目决策

- 上游工作副本：`/Users/whami/Desktop/code/github/FairScan`。
- 基线版本：Git tag `v2.2.0`，commit `2297341`。
- 用户已明确决定允许直接移植 FairScan 的 GPLv3 代码，并承担该决定的责任。该决定不改变 GPLv3 的通知、源代码可得性和再发布义务；本计划要求在实现时保留这些可追溯资料，而不将其静默删除。
- 每个直接移植的 Kotlin 文件保留原始版权头，在其后增加一段 ASCII 注释，写明 `Upstream: FairScan v2.2.0 (2297341), original path: ...` 与本地变更摘要。
- 新建 `docs/third-party/fairscan-sources.md`，逐项记录上游路径、上游 blob SHA、目标路径、直接复制或改写状态、修改原因、依赖许可证和验证命令。
- 仓库根目录 `LICENSE`、`NOTICE`、发行说明和应用内“开源许可证”入口必须包含 GPLv3 全文及 FairScan attribution；发布 APK/AAB 时提供对应源代码、构建脚本和模型取得说明。
- 模型不是 FairScan Git 仓库内的普通源码。必须单独记录模型 URL、版本、SHA-256、许可证和获取日期；哈希不匹配或缺失时不加载模型。

## 不迁移范围

- 不迁移 Compose 界面、Navigation、ViewModel UI 状态或 FairScan 的资源、图标、名称、包名和 application ID；RN 继续实现本项目既有 UX。
- 不把现有 `ScannerCameraView.kt` 的 Camera2 改写成 CameraX；只在其已有图像回调中增加后台、节流的分析入口。
- 不迁移 Tesseract、OCR、可搜索 PDF、PDFBox-Android、外部 intent 扫描流程、数据库同步、文件系统外部下载保存策略或分析/崩溃上报。
- 不采用 FairScan 按识别纸张尺寸生成 PDF 的策略；继续执行 PRD 的 A4、10mm 白边、App 沙盒、重名递增、预览和分享要求。
- 不将扫描图片、PDF 内容、标题、文件名或完整路径写入诊断日志；模型状态只记录枚举状态和耗时分桶。

## 目标边界

```text
android/app/src/main/java/com/scanapp/
  fairscan/
    SOURCE-MANIFEST.md                 # 上游快照清单和本地调整说明
    imageprocessing/                   # 直接移植的 FairScan 算法与版权头
    segmentation/FairScanSegmentationService.kt
    camera/QuadStabilizer.kt
  FairScanDocumentDetector.kt          # Android Bitmap/ScanQuad 适配层
  DocumentDetector.kt                  # FairScan -> OpenCV -> fallback 编排器
  ImageEnhancer.kt                     # FairScan Retinex 实现的本地适配
  ScannerCameraView.kt                 # 保持 Camera2，仅增加实时分析回调
  ScanFileStore.kt                     # 原图、编辑配方、派生产物与清理
  ScannerModule.kt                     # RN 参数转换、后台调度、错误映射

android/app/src/main/assets/models/
  fairscan-document-segmentation.tflite
  fairscan-document-segmentation.tflite.sha256

docs/third-party/
  fairscan-sources.md
  fairscan-model.md
```

## 统一接口

- `FairScanSegmentationService.analyze(bitmap: Bitmap, mode: AnalysisMode): SegmentationAnalysis?`：返回概率 mask、输入缩放信息和模型版本；模型不可用、推理失败、输出形状异常时返回 `null`，不得抛给 UI。
- `FairScanDocumentDetector.detect(bitmap: Bitmap, mode: AnalysisMode): DocumentDetector.Detection?`：将 FairScan `Quad` 映射为原图像素坐标、归一化 `ScanQuad` 和 `FAIRSCAN` 来源；不产生 fallback。
- `DocumentDetector.detect(bitmap: Bitmap, mode: AnalysisMode = CAPTURE): Detection`：按 FairScan、`detectWithOpenCv`、`fallback` 的固定顺序返回结果。
- `DocumentDetector.Source` 扩展为 `FAIRSCAN`、`OPENCV`、`FALLBACK`；JS 映射为 `'fairscan' | 'opencv' | 'fallback'`。
- `QuadStabilizer.offer(quad: ScanQuad?, timestampNanos: Long): ScanQuad?`：仅在连续、有效且位移低于阈值的样本中输出稳定四角；输入为 `null` 时清空候选状态。
- `EnhanceMode` 扩展为 `'original' | 'enhanced' | 'grayscale' | 'blackwhite'`；`original` 永远读取原图，其他模式由原图和编辑配方重新生成，禁止把上一张处理图继续处理。

### Task 1: 建立可追溯的 FairScan 上游快照

**Files:**
- Create: `android/app/src/main/java/com/scanapp/fairscan/SOURCE-MANIFEST.md`
- Create: `docs/third-party/fairscan-sources.md`
- Create: `docs/third-party/fairscan-model.md`
- Create: `NOTICE`
- Modify: `LICENSE`
- Modify: `README.md`
- Test: `scripts/verify-third-party-notices.sh`

**Interfaces:**
- `fairscan-sources.md` 为每个上游文件记录 `source path`、`source blob SHA`、`target path`、`copy mode`、`local changes`、`copyright` 和 `license` 七列。
- `fairscan-model.md` 为模型记录版本、来源 URL、下载日期、SHA-256、输入尺寸、归一化方式、输出张量形状和许可文本位置。
- `NOTICE` 中的 FairScan 条目指向上游仓库、`v2.2.0` 和 `2297341`，且不替换或缩短 GPLv3 文本。

- [ ] **Step 1: Write the failing checks**

  新建 `scripts/verify-third-party-notices.sh`。脚本检查 `fairscan-sources.md` 覆盖下列直接依赖入口：`imageprocessing/.../DocumentDetection.kt`、`Perspective.kt`、`PostProcessing.kt`、`quad/` 下的直接依赖文件、`app/.../ImageSegmentation.kt`、`app/.../QuadStabilizer.kt`；检查每个移植 Kotlin 文件同时含原版权头和 `Upstream:` 注释；检查 `LICENSE`、`NOTICE` 和 README 含 FairScan/GPLv3 attribution。

- [ ] **Step 2: Run checks to verify they fail**

  Run: `bash scripts/verify-third-party-notices.sh`

  Expected: FAIL，指出缺失的来源登记、许可证文本或版权注释。

- [ ] **Step 3: Write minimal implementation**

  从 `/Users/whami/Desktop/code/github/FairScan` 锁定 `v2.2.0` 的各文件 blob SHA，并建立上述三份清单。仅复制算法所需的 Kotlin 源文件到 `com.scanapp.fairscan`，原封不动保留 GPLv3 版权头；将包名改为本地包名时紧接版权头写出上游和修改记录。将 GPLv3 正文和 FairScan attribution 写入发行所用 `LICENSE`/`NOTICE`，README 说明对应源代码的取得位置。

- [ ] **Step 4: Run checks to verify they pass**

  Run: `bash scripts/verify-third-party-notices.sh`; `git diff --check`

  Expected: PASS；所有直接复制文件均能追溯到固定上游 blob，且无空白错误。

### Task 2: 以可验证资产接入 LiteRT 文档分割

**Files:**
- Modify: `android/app/build.gradle`
- Create: `android/app/src/main/assets/models/fairscan-document-segmentation.tflite`
- Create: `android/app/src/main/assets/models/fairscan-document-segmentation.tflite.sha256`
- Create: `android/app/src/main/java/com/scanapp/fairscan/segmentation/FairScanSegmentationService.kt`
- Create: `android/app/src/test/java/com/scanapp/fairscan/segmentation/ModelManifestTest.kt`
- Create: `android/app/src/androidTest/java/com/scanapp/fairscan/segmentation/FairScanSegmentationServiceInstrumentedTest.kt`
- Modify: `docs/third-party/fairscan-model.md`

**Interfaces:**
- `enum class SegmentationAvailability { READY, ASSET_MISSING, HASH_MISMATCH, INTERPRETER_ERROR, OUTPUT_INVALID }`。
- `SegmentationAnalysis` 包含只读 `probabilityMask: Mat`、`maskSize: ImageSize`、`originalSize: ImageSize`、`availability`；调用方负责在 `use`/`finally` 中释放 mask。
- 模型必须从 App assets 加载，不允许运行时联网下载；模型哈希使用 SHA-256 验证后才创建 LiteRT interpreter。

- [ ] **Step 1: Write the failing tests**

  JVM 测试断言 asset 清单中 SHA-256 是 64 位十六进制、模型文件哈希匹配，且无模型时返回 `ASSET_MISSING`。仪器测试对固定的小型测试图片断言：输入被缩放/归一化后，输出 mask 与输入尺寸映射一致，概率均在 `0..1`，不因旋转 EXIF 而错位。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.fairscan.segmentation.ModelManifestTest`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.fairscan.segmentation.FairScanSegmentationServiceInstrumentedTest`

  Expected: FAIL，因为 LiteRT 依赖、受校验模型 asset 和服务尚不存在。

- [ ] **Step 3: Write minimal implementation**

  按 FairScan `app/src/main/java/org/fairscan/app/domain/ImageSegmentation.kt` 直接移植 resize、浮点归一化、interpreter 调用和输出概率图转换，并由本地服务封装 asset 打开和哈希校验。将 LiteRT 依赖锁定到经构建验证的精确版本，配置 `noCompress 'tflite'`，使用单线程 interpreter 并在应用终止时关闭。模型、hash 文件和许可证说明作为同一变更提交；不能验证模型来源/许可证时不将模型打包。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.fairscan.segmentation.ModelManifestTest`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.fairscan.segmentation.FairScanSegmentationServiceInstrumentedTest`; `cd android && ./gradlew :app:assembleDebug`

  Expected: PASS；Debug APK 包含已校验模型，模型缺失或损坏时自动降级且不崩溃。

### Task 3: 直接移植 FairScan 四边形检测和透视几何

**Files:**
- Create: `android/app/src/main/java/com/scanapp/fairscan/imageprocessing/DocumentDetection.kt`
- Create: `android/app/src/main/java/com/scanapp/fairscan/imageprocessing/Perspective.kt`
- Create: `android/app/src/main/java/com/scanapp/fairscan/imageprocessing/quad/`
- Create: `android/app/src/main/java/com/scanapp/FairScanDocumentDetector.kt`
- Create: `android/app/src/test/java/com/scanapp/FairScanDocumentDetectorTest.kt`
- Create: `android/app/src/androidTest/java/com/scanapp/FairScanDocumentDetectorInstrumentedTest.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScanGeometryTypes.kt`

**Interfaces:**
- `AnalysisMode` 与上游 `CAPTURE`、`IMPORT`、`LIVE_ANALYSIS` 语义一一对应；拍照/相册允许 adaptive threshold，实时预览只用 `0.9` 阈值。
- `FairScanDocumentDetector` 只接受 `Bitmap` 与 `AnalysisMode`，输出的 `ScanQuad` 始终为 TL/TR/BR/BL 顺时针、`0..1` 归一化坐标。
- 对应 FairScan `detectDocumentQuad` 的多阈值、Gaussian blur、morphological close/open、最大轮廓、方向导向四边形和 `scoreQuadAgainstProbmap` 必须同批迁入，禁止只复制顶层函数而遗漏依赖。

- [ ] **Step 1: Write the failing tests**

  用受控概率 mask 覆盖正面 A4、倾斜卡片、复杂背景、两个候选对象、断裂边缘和纯空 mask。断言输出角点顺序、面积、稳定置信度和缩放回原图后的误差不超过 2% 长边。另测无候选时服务返回 `null`，不生成伪高置信度四角。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.FairScanDocumentDetectorTest`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.FairScanDocumentDetectorInstrumentedTest`

  Expected: FAIL，因为上游算法包和 Bitmap/ScanQuad 适配层尚未存在。

- [ ] **Step 3: Write minimal implementation**

  从 FairScan 的 `DocumentDetection.kt`、`Perspective.kt` 及 `imageprocessing/quad` 所需文件直接迁入本地包，保留所有版权头并更新来源清单。实现 `BitmapMask` 把 LiteRT 浮点输出转为上游 `Mask`，将上游 `Quad` 映射到 `ScanQuad` 后复用 `QuadGeometry.isValidNormalizedQuad` 做最终防线。仅当模型为 `READY`、mask 有效、角点通过校验且源图非回收状态时返回 `FAIRSCAN` 检测结果。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.FairScanDocumentDetectorTest`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.FairScanDocumentDetectorInstrumentedTest`

  Expected: PASS；空/异常 mask 不泄漏 Mat，四角坐标正确回投到原图。

### Task 4: 将检测器升级为三级降级链，并扩展 RN 可观测结果

**Files:**
- Modify: `android/app/src/main/java/com/scanapp/DocumentDetector.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/native/scannerModule.ts`
- Modify: `src/screens/CropScreen.tsx`
- Modify: `__tests__/CropScreen.test.tsx`
- Create: `android/app/src/androidTest/java/com/scanapp/DocumentDetectorFallbackInstrumentedTest.kt`

**Interfaces:**
- 保留原有 OpenCV 算法为 `detectWithOpenCv(bitmap)`；其公开入口先调用 `FairScanDocumentDetector`，失败后调用 OpenCV，最后调用 `fallback`。
- `EdgeDetectionResult.source` 为必填的 `'fairscan' | 'opencv' | 'fallback'`；`confidence` 取 `0..1`，且 fallback 固定为低于 `0.3`。
- 仅将来源用于 UI 的低置信度提示和测试；不得将文件名、路径、图片内容或模型输出写入日志。

- [ ] **Step 1: Write the failing tests**

  添加可替换的 segmentation/detector 依赖测试：FairScan 成功时 OpenCV 不被调用；模型不可用时 OpenCV 结果原样使用；二者都失败时返回 8% 内边距和 `'fallback'`。RN 测试断言三种 source 都能显示裁剪页，低置信度提示只在 fallback 出现。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/CropScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.DocumentDetectorFallbackInstrumentedTest`

  Expected: FAIL，因为当前接口只识别 `opencv`/`fallback`，且没有 FairScan 分支。

- [ ] **Step 3: Write minimal implementation**

  使用构造函数或内部可注入接口隔离 `FairScanDocumentDetector`，确保不需真实模型即可测试降级顺序。`ScannerModule.detectDocumentEdges` 保持原 JSON 键名与归一化坐标不变，只增加 `source: 'fairscan'`。对分析异常做本地错误计数和耗时分桶，禁止序列化 Throwable message、路径或图片元数据。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/CropScreen.test.tsx`; `npx tsc --noEmit`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.DocumentDetectorFallbackInstrumentedTest`; `cd android && ./gradlew :app:assembleDebug`

  Expected: PASS；JS 与 Android 保持兼容，模型失败时仍能完成手工裁剪流程。

### Task 5: 在现有 Camera2 预览中接入稳定四角实时分析

**Files:**
- Create: `android/app/src/main/java/com/scanapp/fairscan/camera/QuadStabilizer.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerCameraView.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerCameraViewManager.kt`
- Modify: `src/screens/CameraScreen.tsx`
- Modify: `__tests__/CameraCaptureStability.test.ts`
- Create: `android/app/src/test/java/com/scanapp/fairscan/camera/QuadStabilizerTest.kt`
- Create: `android/app/src/androidTest/java/com/scanapp/CameraFairScanAnalysisInstrumentedTest.kt`

**Interfaces:**
- `ScannerCameraView` 最多每 `350ms` 处理一帧，且同一时刻最多一个实时分析任务；最终拍照检测不受该节流限制。
- `onDocumentCorners` 仅发出已稳定且有限的 `DocumentCorners`，事件附带 `source` 和 `confidence`，不附带图片、完整路径或模型 mask。
- `QuadStabilizer` 使用时间窗/角点平均/最大移动阈值；相机停止、权限撤销、surface 销毁或旋转变化时调用 `reset()`。

- [ ] **Step 1: Write the failing tests**

  JUnit 测试覆盖抖动但同一纸张的连续样本可稳定、超过移动阈值的样本不输出、`null` 清空状态、输入 NaN/自交四边形被拒绝。仪器测试在模拟预览帧中断言分析节流、最多一个 in-flight 任务、pause/resume 后没有陈旧事件和拍照 promise 泄漏。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/CameraCaptureStability.test.ts`; `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.fairscan.camera.QuadStabilizerTest`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.CameraFairScanAnalysisInstrumentedTest`

  Expected: FAIL，因为当前 Camera2 流没有实时分析状态机或稳定器。

- [ ] **Step 3: Write minimal implementation**

  直接迁入并本地适配 FairScan `app/src/main/java/org/fairscan/app/ui/screens/camera/QuadStabilizer.kt`，保留其上游头并将上游 UI 类型替换成 `ScanQuad`。在现有 Camera2 的后台 executor 从 YUV/Bitmap 转换后的缩略帧调用 `DocumentDetector.detect(..., LIVE_ANALYSIS)`；以原子 in-flight 标记、单调时钟和生命周期取消控制任务。RN 仅绘制事件中的四角叠层，不能触发拍摄或保存任何预览帧。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/CameraCaptureStability.test.ts`; `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.fairscan.camera.QuadStabilizerTest`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.CameraFairScanAnalysisInstrumentedTest`

  Expected: PASS；预览不阻塞 UI，切后台后不发事件，最终拍照可稳定完成。

### Task 6: 将 FairScan Retinex 增强迁入现有图像管线并补齐黑白模式

**Files:**
- Create: `android/app/src/main/java/com/scanapp/fairscan/imageprocessing/PostProcessing.kt`
- Modify: `android/app/src/main/java/com/scanapp/ImageEnhancer.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/data/models.ts`
- Modify: `src/screens/EnhanceScreen.tsx`
- Modify: `__tests__/EnhanceScreen.test.tsx`
- Create: `android/app/src/androidTest/java/com/scanapp/FairScanImageEnhancerInstrumentedTest.kt`

**Interfaces:**
- `enhanced` 使用 FairScan `enhanceColorImage`：Lab 色彩空间的 L 通道 multi-scale Retinex，再保留 a/b 色度。
- `grayscale` 使用 FairScan `enhanceGrayImage`：Retinex、百分位归一化和双边滤波。
- `blackwhite` 为本项目独立二值化模式：先灰度，再自适应阈值；不迁移 OCR 或文字识别依赖。
- 全部模式的输出与原图方向一致；处理上限为明确的像素预算，超出时等比缩放处理再回写目标尺寸，所有 `Mat` 在 `finally` 释放。

- [ ] **Step 1: Write the failing tests**

  用彩色文档样图断言 `original` 尺寸/像素统计不变，`enhanced` 保留彩色通道并提升低对比区域，`grayscale` 三通道近似一致，`blackwhite` 只有二值等级，四个模式均保持宽高与旋转方向。大图测试断言在预算内完成，无效模式映射为 `ENHANCE_FAILED`。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/EnhanceScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.FairScanImageEnhancerInstrumentedTest`

  Expected: FAIL，因为当前增强器只提供轻度 OpenCV 增强，JS 也未声明 `blackwhite`。

- [ ] **Step 3: Write minimal implementation**

  直接迁入 FairScan `imageprocessing/.../PostProcessing.kt` 及其必要纯算法依赖，并以 `ImageEnhancer` 适配 `Bitmap`/`Mat`。保留既有 `original` 分支；黑白模式只在本地实现 `adaptiveThreshold`。当 Retinex 失败或内存不足时抛出统一 `ENHANCE_FAILED`，页面保留原处理图并允许用户重新选择，而不是把失败文件写入工作区。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/EnhanceScreen.test.tsx`; `npx tsc --noEmit`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.FairScanImageEnhancerInstrumentedTest`

  Expected: PASS；四种滤镜均可预览和确认，失败不会污染原图或页面状态。

### Task 7: 用原图与编辑配方重新生成页面，避免有损级联编辑

**Files:**
- Modify: `android/app/src/main/java/com/scanapp/ScanFileStore.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/data/models.ts`
- Modify: `src/data/fileStore.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/screens/CropScreen.tsx`
- Modify: `src/screens/EnhanceScreen.tsx`
- Modify: `__tests__/CropScreen.test.tsx`
- Modify: `__tests__/EnhanceScreen.test.tsx`
- Create: `android/app/src/androidTest/java/com/scanapp/ScanRecipeRegenerationInstrumentedTest.kt`

**Interfaces:**
- `ScanPage` 持久化 `originalImagePath`、归一化 `corners`、`rotationDegrees`、`enhanceMode` 和可选 `processedImagePath`；编辑配方不得持久化绝对外部路径。
- `ScannerModule.renderPage(originalImagePath, recipe)` 从原图执行裁剪、旋转和滤镜，并在成功后以原子方式替换派生产物。
- `ScanFileStore` 为每页分开保存 original、working 与 thumbnail；删除工程只能删除当前 document ID 的工作目录。

- [ ] **Step 1: Write the failing tests**

  添加测试：连续更改四角、旋转和滤镜后，每一次渲染输入仍是原图；从 `enhanced` 切换到 `original` 恢复原始像素；删除/重排不改变其余页的配方；派生产物写入失败后旧文件仍可用。JS 测试覆盖重启恢复扫描工程后重新编辑。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/CropScreen.test.tsx __tests__/EnhanceScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.ScanRecipeRegenerationInstrumentedTest`

  Expected: FAIL，因为当前编辑链可能把上一张处理图作为下一次操作输入，且没有统一 recipe render 接口。

- [ ] **Step 3: Write minimal implementation**

  参考 FairScan `ImageRepository.kt` 与 `DocumentMetadata.kt` 的“原图 + 归一化角点 + 旋转 + filter”理念，不复制其 Room/Compose 数据层。以本项目 `ScanFileStore` 和 JS `fileStore` 存储 recipe，所有编辑都调用单一原生重渲染入口。写入产物使用临时文件并原子替换；恢复时仅记录非敏感状态，日志不包含标题、文件名或完整路径。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/CropScreen.test.tsx __tests__/EnhanceScreen.test.tsx`; `npx tsc --noEmit`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.ScanRecipeRegenerationInstrumentedTest`

  Expected: PASS；重复编辑无累计失真，失败恢复不丢失原图和已确认页面。

### Task 8: 保持 PDF 约束并完成隐私、构建和真机验收

**Files:**
- Modify: `android/app/src/main/java/com/scanapp/PdfExporter.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/screens/ExportScreen.tsx`
- Modify: `__tests__/ExportScreen.test.tsx`
- Modify: `docs/planning/PROJECT-PLAN.v2026-08-28.md`
- Modify: `README.md`
- Create: `docs/testing/fairscan-integration-acceptance.md`
- Test: all Jest, JVM, Android instrumented and release build checks

**Interfaces:**
- `PdfExporter.create` 保持 `A4`、`10mm`、`auto|portrait|landscape`、App sandbox、重名递增和非 searchable PDF。
- 导出可使用 recipe 重新渲染后的页面，但不能调用 OCR、Tesseract、PDFBox 或将原图嵌入日志。
- `exportLogs` 输出中只有版本、设备/API、功能开关、错误码、模型 availability、耗时分桶和计数。

- [ ] **Step 1: Write the failing tests and acceptance checklist**

  增加 PDF 单页/20 页、A4/10mm、横竖自动、同名递增、取消/失败清理测试。增加日志快照测试，注入标题、文件名、绝对路径、图片/PDF 字节并断言全部不出现。验收文档列出 API 29、一个 API 33 和一个 API 35 真机的相机/相册、权限拒绝、弱光、复杂背景、A4/票据/卡片/手写内容、模型缺失、切后台恢复和导出分享场景。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/ExportScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest`; `npm run lint`; `npx tsc --noEmit`

  Expected: FAIL，直到新增隐私断言、20 页导出覆盖和 FairScan 降级场景都有实现。

- [ ] **Step 3: Write minimal implementation**

  保留当前 `PdfExporter` 的 Android `PdfDocument`、白边和命名策略，只调整其消费 recipe 派生产物的接口。补充不含敏感数据的结构化诊断事件、release 打包检查和真机验收记录；发行物包含模型来源信息、GPLv3/NOTICE 和对应源代码取得说明。

- [ ] **Step 4: Run verification suite**

  Run: `npm test -- --runInBand`; `npm run lint`; `npx tsc --noEmit`; `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`; `cd android && ./gradlew :app:connectedDebugAndroidTest`; `bash scripts/verify-third-party-notices.sh`; `git diff --check`

  Expected: 全部 PASS；三台 API 29+ 真机验收记录完整，模型不可用时仍可用 OpenCV/fallback 完成扫描、手动裁剪和 A4 PDF 导出。

## 执行顺序与检查点

1. 先完成 Task 1，确保任何直接移植的文件、模型和发行义务都可追溯。
2. 完成 Task 2 和 Task 3 后，只在独立适配层运行 FairScan；不修改公开 RN 返回结构。
3. 完成 Task 4 后，必须先验证无模型时的 OpenCV/fallback 流程，再让页面消费 `'fairscan'` 来源。
4. 完成 Task 5 后，才将实时稳定四角发送到相机界面；不得阻塞最终拍照路径。
5. 完成 Task 6 和 Task 7 后，验证原图驱动的重渲染和 `blackwhite` 滤镜。
6. Task 8 是发布闸门。只有构建、自动化、隐私扫描和三台真机记录全部通过，才允许合并 FairScan 集成。

## 手工验收标准

- 在 API 29、API 33、API 35 三台真机中，A4、收据、卡片和手写页面在正常光照、弱光和复杂背景下均可拍摄、自动/手动裁剪、旋转、切换四种滤镜、排序、删除、重新编辑和导出。
- 模型 asset 缺失、哈希损坏、interpreter 初始化失败或输出异常时，应用不崩溃；结果明确标为 `opencv` 或 `fallback`，用户仍可手动调整四角。
- 连续拍摄 20 页、切后台再返回、拒绝并重新授予相机/相册权限时，无 pending promise、ANR、陈旧四角或临时文件泄漏。
- PDF 始终是 A4、10mm 白边、App 沙盒存储；重名生成递增名称；预览/分享成功后扫描工程仍存在。
- 导出的日志、APK/AAB、测试报告和源代码中均不含扫描图片、PDF 内容、标题、文件名或完整路径；发布材料能定位 FairScan 上游版本、每个移植文件、模型来源和 GPLv3 文本。
