# MakeACopy 扫描核心借鉴落地实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留 React Native 页面流程和现有 `ScannerModule` 契约的前提下，逐步引入 MakeACopy 中可复用的文档检测、透视矫正、图像增强和测试思路，完成符合 PRD 的 Android 扫描 MVP。

**Architecture:** JS/RN 只负责页面导航、编辑状态和文档模型；Android 原生层按 `DocumentDetector`、`PerspectiveWarper`、`ImageEnhancer`、`PdfExporter` 和文件工作区拆分。MakeACopy 的 Java/XML 页面、Room/OCR/PDFBox 搜索文本链路不迁移，只提取算法边界和验证策略。

**Tech Stack:** React Native、Kotlin、Android Camera2（现有实现）、OpenCV Android、Android `PdfDocument`、Jest、JUnit/Android instrumented tests。

**Spec:** `docs/requirements/PRD.v2026-08-28.md`、`docs/requirements/PRD.v2026-08-27.1.md`、`docs/design/UX-UI-Mini-Spec.v2026-08-28.md`

## Global Constraints

- Android MVP 最低支持 Android 10 / API 29+。
- RN 负责页面流程和状态管理；相机、边缘识别、透视矫正、图像增强、PDF 生成在原生层完成。
- 支持单页、多页、相册多选、手动四角调整、滤镜、排序、删除和重新编辑。
- PDF 默认 A4、10mm 白边，保存在 App 沙盒；导出后保留扫描工程并支持预览和系统分享。
- MVP 不做 OCR、登录、云同步、会员、远程埋点和远程崩溃上报。
- 日志不得包含标题、文件名、完整路径、图片或 PDF 内容。
- 不整体复制 MakeACopy 的 Activity、Fragment、XML、Room、Hilt、OCR、PDFBox 或 Gradle 构建体系。
- 复制 Apache 2.0 源码时保留版权头、许可证和 NOTICE，并标记本地修改；模型和第三方依赖按各自许可证单独归档。

## 目标文件结构

执行后 Android 侧应形成以下边界，现有 RN API 名称保持不变：

```text
android/app/src/main/java/com/scanapp/
  ScannerModule.kt              # RN bridge，只做参数转换和异步调度
  DocumentDetector.kt            # OpenCV 检测，返回归一化四角和置信度
  PerspectiveWarper.kt           # 四边形校验、目标尺寸和透视变换
  ImageEnhancer.kt               # original/grayscale/enhanced 三种 MVP 模式
  PdfExporter.kt                 # A4、方向、10mm 白边、重名策略
  ScanFileStore.kt               # 工程目录、页面图片、临时文件和清理
  ScanGeometryTypes.kt           # 原生点和四边形数据结构
  QuadGeometry.kt                # 与 UI 无关的四边形几何校验
```

### Task 1: 固化原生接口和数据约束

**Files:**
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/native/scannerModule.ts`
- Create: `android/app/src/main/java/com/scanapp/ScanGeometryTypes.kt`
- Create: `android/app/src/main/java/com/scanapp/QuadGeometry.kt`
- Create: `android/app/src/test/java/com/scanapp/QuadGeometryTest.kt`
- Test: `__tests__/AppCaptureFallback.test.tsx`

**Interfaces:**
- `DocumentCorners` 使用 `topLeft/topRight/bottomRight/bottomLeft`，每个点的 `x/y` 范围为 `0..1`。
- `detectDocumentEdges(imagePath)` 返回 `{ corners: DocumentCorners, confidence: number, source?: 'opencv' | 'fallback' }`。
- 原生失败统一使用 `DETECT_FAILED`、`CROP_FAILED`、`ENHANCE_FAILED`、`PDF_FAILED`，不得将失败伪装成成功路径。
- `data class ScanPoint(val x: Double, val y: Double)` 和 `data class ScanQuad(val topLeft: ScanPoint, val topRight: ScanPoint, val bottomRight: ScanPoint, val bottomLeft: ScanPoint)` 是原生层统一的数据结构。
- `QuadGeometry.isValidNormalizedQuad(quad: ScanQuad): Boolean` 检查有限数值、范围容忍度、凸性、顺时针角点顺序和最小面积。

- [ ] **Step 1: Write the failing tests**

  在纯 JVM JUnit 中增加归一化四角边界用例：正常梯形通过；重复点、反向顺序、自交四边形、面积过小和 NaN 输入失败。RN 测试断言原生检测结果的可选 `source` 不影响现有页面流程。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/AppCaptureFallback.test.tsx`; `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.QuadGeometryTest`
  Expected: 新增的几何断言或返回字段断言失败，因为原生校验函数和返回字段尚未存在。

- [ ] **Step 3: Write minimal implementation**

  将校验放在 `QuadGeometry`，`ScannerModule` 只负责把归一化坐标转换为 Bitmap 像素坐标并调用它；保留现有 JS API 的异步形态。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/AppCaptureFallback.test.tsx`; `npx tsc --noEmit`; `cd android && ./gradlew :app:testDebugUnitTest --tests com.scanapp.QuadGeometryTest`
  Expected: PASS。

### Task 2: 接入 OpenCV 文档检测，并保留可控 fallback

**Files:**
- Create: `android/app/src/main/java/com/scanapp/DocumentDetector.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `android/app/build.gradle`
- Modify: `android/settings.gradle`（仅在采用独立 OpenCV module 时）
- Create: `android/app/src/androidTest/java/com/scanapp/DocumentDetectorInstrumentedTest.kt`
- Create: `docs/third-party/makeacopy-notices.md`

**Interfaces:**
- `DocumentDetector.detect(bitmap: Bitmap): Detection`。
- `Detection` 包含 `cornersPx: FloatArray`（8 个值，TL/TR/BR/BL）、`confidence: Float`、`source: Source`。
- 预处理最长边固定为 `720px`，与 MakeACopy `OpenCVUtils.DETECTION_MAX_EDGE` 的原则一致。
- 检测顺序为 OpenCV 候选筛选 -> 四边形校验 -> fallback；fallback 的置信度必须为低值，不能返回伪造高置信度。

- [ ] **Step 1: Write the failing tests**

  用合成 Bitmap 覆盖白色矩形、倾斜四边形、纯色背景和空图；断言输出角点顺序、置信度范围和 fallback source。测试不得依赖真实摄像头。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.DocumentDetectorInstrumentedTest`
  Expected: FAIL，因为 OpenCV 检测器尚未实现。

- [ ] **Step 3: Write minimal implementation**

  不复制 MakeACopy 的整套 `org.opencv.*` Java 包。优先使用可验证的 OpenCV Android 依赖或独立 native module；从 `OpenCVUtils` 提取灰度化、边缘、轮廓、近似多边形、面积/角度筛选和 fallback 逻辑。每次 Mat/Bitmap 都在 `finally` 释放，检测失败时返回明确的 fallback。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.DocumentDetectorInstrumentedTest`
  Expected: PASS；再运行 `./gradlew :app:assembleDebug` 验证 RN bridge 与 native ABI 能链接。

### Task 3: 替换透视矫正并增加角点拖拽安全约束

**Files:**
- Create: `android/app/src/main/java/com/scanapp/PerspectiveWarper.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/screens/CropScreen.tsx`
- Modify: `__tests__/CropScreen.test.tsx`
- Create: `android/app/src/androidTest/java/com/scanapp/PerspectiveWarperInstrumentedTest.kt`

**Interfaces:**
- `PerspectiveWarper.warp(source: Bitmap, cornersNormalized: DocumentCorners): Bitmap`。
- 目标宽高由四边像素长度计算，至少为 `1x1`，不对已裁剪图像做无意义放大。
- 透视失败必须抛出 `CROP_FAILED`，不能默默返回原图。

- [ ] **Step 1: Write the failing tests**

  测试正面矩形保持尺寸比例；倾斜四边形输出为近似矩形；自交、重复点、超出容忍范围输入失败；四角拖拽后 UI 仍能确认并传递归一化坐标。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/CropScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.PerspectiveWarperInstrumentedTest`
  Expected: 新增用例失败。

- [ ] **Step 3: Write minimal implementation**

  参考 MakeACopy 的 `OpenCVUtils.applyPerspectiveCorrection`：使用 `getPerspectiveTransform` + `warpPerspective`，目标尺寸取上下边最大长度和左右边最大长度并加 1；把 `CropEdgeGeometry` 的边命中、平移、面积方向校验改写成 Kotlin `QuadGeometry`，禁止拖拽导致自交或方向翻转。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/CropScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.PerspectiveWarperInstrumentedTest`
  Expected: PASS。

### Task 4: 引入精简版图像增强管线

**Files:**
- Create: `android/app/src/main/java/com/scanapp/ImageEnhancer.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/screens/EnhanceScreen.tsx`
- Modify: `__tests__/EnhanceScreen.test.tsx`
- Create: `android/app/src/androidTest/java/com/scanapp/ImageEnhancerInstrumentedTest.kt`

**Interfaces:**
- `ImageEnhancer.apply(source: Bitmap, mode: EnhanceMode): Bitmap`。
- `original` 原样输出；`grayscale` 灰度；`enhanced` 采用温和对比度/锐化，不引入 OCR 专用二值化。
- 输出 JPEG 质量默认 `92`，临时文件由 `ScanFileStore` 管理。

- [ ] **Step 1: Write the failing tests**

  用彩色合成图断言 grayscale 三通道接近；original 的尺寸和像素统计不变；enhanced 不改变尺寸；无效 mode 返回 `ENHANCE_FAILED`。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/EnhanceScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.ImageEnhancerInstrumentedTest`
  Expected: 新增原生增强测试失败。

- [ ] **Step 3: Write minimal implementation**

  参考 MakeACopy `DocumentCleanupProcessor` 的模式拆分，但只保留 MVP 必需操作：灰度、轻度 CLAHE/对比度和温和锐化。对大图先按最长边上限缩放，避免一次性占用过多内存；所有中间 Mat 在 `finally` 释放。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/EnhanceScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.ImageEnhancerInstrumentedTest`
  Expected: PASS。


### Task 5: 稳定多页文件工作区和 PDF 导出

**Files:**
- Create: `android/app/src/main/java/com/scanapp/ScanFileStore.kt`
- Create: `android/app/src/main/java/com/scanapp/PdfExporter.kt`
- Modify: `android/app/src/main/java/com/scanapp/ScannerModule.kt`
- Modify: `src/data/fileStore.ts`
- Modify: `src/screens/ExportScreen.tsx`
- Modify: `__tests__/ExportScreen.test.tsx`
- Create: `android/app/src/androidTest/java/com/scanapp/PdfExporterInstrumentedTest.kt`

**Interfaces:**
- `ScanFileStore.createWorkspace(documentId): File`、`savePageImage(documentId, pageId, source, kind): Uri`、`deleteWorkspace(documentId)`。
- `PdfExporter.create(pageImages, outputName, options): File`，options 至少包含 `A4`、`10mm`、`auto|portrait|landscape` 和 JPEG quality。
- 输出文件名经过安全化；同名文件不能覆盖已有 PDF，应生成 `name (2).pdf`、`name (3).pdf` 形式的候选名。

- [ ] **Step 1: Write the failing tests**

  测试一页/多页、横竖方向、10mm 白边、空页面跳过策略、同名文件递增和导出失败后的临时文件清理；JS 测试覆盖导出后保留工程、预览和分享路径。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/ExportScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.PdfExporterInstrumentedTest`
  Expected: 重名和原生分页用例失败。

- [ ] **Step 3: Write minimal implementation**

  保留 Android `PdfDocument`，不引入 MakeACopy 的 searchable PDF/PDFBox/OCR 链路。把页尺寸、边距、缩放和文件命名从 `ScannerModule` 拆出；创建 PDF 使用临时文件，写入成功后原子替换，失败时删除临时文件。Bitmap 使用完立即回收或释放引用。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/ExportScreen.test.tsx`; `cd android && ./gradlew :app:connectedDebugAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.scanapp.PdfExporterInstrumentedTest`
  Expected: PASS。


### Task 6: 相机稳定性、生命周期和性能验证

**Files:**
- Modify: `android/app/src/main/java/com/scanapp/ScannerCameraView.kt`
- Modify: `android/app/src/main/java/com/scanapp/MainActivity.kt`
- Modify: `src/screens/CameraScreen.tsx`
- Modify: `__tests__/CameraCaptureStability.test.ts`
- Create: `android/app/src/androidTest/java/com/scanapp/CameraCaptureInstrumentedTest.kt`

**Interfaces:**
- 同一时刻只允许一个 capture promise；相机关闭、权限拒绝、Activity pause/resume 时必须清理 pending capture。
- 拍摄结果必须带正确的 EXIF/传感器方向处理，交给后续检测时角点坐标和显示图方向一致。
- 预览检测不可阻塞 UI；最终检测在拍摄完成后单独执行。

- [ ] **Step 1: Write the failing tests**

  补充连续点击快门、权限拒绝后重试、Activity 切后台再回来、闪光灯切换、旋转方向和大图处理超时的测试。

- [ ] **Step 2: Run tests to verify they fail**

  Run: `npm test -- --runInBand __tests__/CameraCaptureStability.test.ts`；设备连接后运行 `cd android && ./gradlew :app:connectedDebugAndroidTest`。
  Expected: 至少有生命周期或重复 capture 用例先失败。

- [ ] **Step 3: Write minimal implementation**

  参考 MakeACopy CameraX 的职责拆分，但不替换现有 Camera2；补齐状态机、回调清理、方向矩阵和线程切换。把检测和图像处理放到后台 executor，回调只在 promise 尚未完成时 resolve/reject。

- [ ] **Step 4: Run tests to verify they pass**

  Run: `npm test -- --runInBand __tests__/CameraCaptureStability.test.ts`；在至少一台 API 29+ 真机和一台 API 35+ 真机运行 `cd android && ./gradlew :app:connectedDebugAndroidTest`。
  Expected: PASS；无 pending promise、ANR 或明显预览卡顿。

### Task 7: 依赖、许可证和回归验收

**Files:**
- Modify: `android/app/build.gradle`
- Create: `LICENSE`
- Create: `NOTICE`
- Create: `docs/third-party/makeacopy-notices.md`
- Modify: `README.md`
- Modify: `docs/planning/PROJECT-PLAN.v2026-08-28.md`
- Test: all existing Jest and Android tests

**Interfaces:**
- 发行包中能追溯 OpenCV 版本、许可证、版权和本地修改；不携带 MakeACopy 的商标、应用 ID、Activity 或无关资源。
- Release 构建不包含测试图片、测试 PDF、调试日志或 OCR/模型资产。

- [ ] **Step 1: Write the failing checks**

  增加脚本或 CI 检查：扫描包内是否出现 `de.schliweb.makeacopy`、测试资产、完整本地路径；检查 NOTICE 中列出 OpenCV 及实际采用的依赖许可证。

- [ ] **Step 2: Run checks to verify they fail**

  Run: `rg -n 'de\\.schliweb\\.makeacopy|src/androidTest/assets|FEATURE_FRAMING_LOGGING' android app src`; `cd android && ./gradlew :app:assembleRelease`
  Expected: 在许可证文件和 release guardrail 尚未建立时检查失败或无法证明通过。

- [ ] **Step 3: Write minimal implementation**

  只加入实际使用的第三方许可证和版权声明；更新 README 的依赖表和隐私说明；为 release 添加测试数据排除检查。不要把 MakeACopy 的完整 `NOTICE` 原样复制进来，避免声明未使用组件。

- [ ] **Step 4: Run checks to verify they pass**

  Run: `npm test -- --runInBand`; `cd android && ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleRelease`; 对 APK/AAB 执行 `unzip -l` 检查资源和 `apkanalyzer` 检查依赖。
  Expected: 所有现有测试和新增测试通过，release 包无测试资产和 OCR 资源。


## 迁移范围决策

明确纳入：

- `OpenCVUtils` 中的检测候选筛选、四边形排序、凸性/面积/角度校验、透视变换目标尺寸计算。
- `CropEdgeGeometry` 中的边命中、正交平移、方向保持和软边界约束。
- `DocumentCleanupProcessor` 中精简后的灰度、对比度、降噪/锐化思路。
- MakeACopy 测试中的异常、边界、回归和真机验证方法。

明确暂不纳入：

- DocQuad ONNX 模型。只有当 OpenCV 在 A4、票据、卡片、手写和复杂背景上达不到验收阈值时，才单独评估模型；模型接入必须另做 APK 体积、ABI、冷启动和许可证评估。
- PaddleOCR、Tesseract、字典、字体和 searchable PDF。当前 PRD 明确不做 OCR。
- MakeACopy 的 Room 数据库、Hilt 注入、Material XML UI、Inbox Mode、OCR Review 和多列文本排版。

## 验收矩阵

| 场景 | 通过标准 |
|---|---|
| Android 10/API 29 | 能拍摄、导入、裁剪、增强、导出和分享 |
| A4/票据/卡片 | 自动角点合理；失败时可手动调整；无自交或翻转 |
| 弱光/复杂背景 | 不崩溃；低置信度时显示可编辑四角，不伪造成功 |
| 单页/20 页 | 页面顺序、删除、重排、重新编辑正确；无明显内存持续增长 |
| 相册多选 | 内容 URI 可读取并复制到工程目录 |
| 权限拒绝 | 用户能看到明确错误并从设置返回重试 |
| PDF 重名 | 不覆盖旧 PDF，生成递增名称 |
| 隐私日志 | 不含标题、文件名、完整路径、图像或 PDF 内容 |

## 风险与回滚

- OpenCV native 集成失败：先保留当前 fallback，实现独立 `DocumentDetector` 后再切换，避免阻塞 RN 页面开发。
- APK 体积或 ABI 增长超限：不接入 DocQuad/ONNX，优先优化 OpenCV 构建和 ABI 过滤。
- 大图导致 OOM：统一限制检测预处理尺寸，处理链路使用后台线程和中间资源释放。
- 算法误检：所有自动检测都必须允许手动四角调整，低置信度不得阻止用户继续。
- 许可证遗漏：任何复制源码或二进制前先更新 `LICENSE/NOTICE`，并只登记实际使用的组件。
