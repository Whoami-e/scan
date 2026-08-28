# 文档扫描 App 整体项目计划与进度 v2026-08-28

## 0. 文档说明

- **统计日期：** 2026-08-28
- **适用范围：** Android MVP，React Native + Android 原生模块
- **当前结论：** 需求和视觉方案已完成交接，评审原型已完成；RN 工程和原生扫描能力尚未开始实现。
- **计划日期：** 当前未提供开发排期，本文只记录阶段顺序、完成条件和依赖关系，不虚构具体完成日期。
- **状态定义：**
  - `已完成`：仓库中已有对应交付物，并完成了当前可执行的验证。
  - `进行中`：已有部分交付物，但仍有明确缺口。
  - `待开始`：尚未建立对应工程或实现。
  - `阻塞`：存在未解决的产品、技术或环境问题，不能进入下一阶段。

本文是项目管理视图，不替代具体需求。功能细节以当前优先级最高的以下文档为准：

1. `docs/design/UX-UI-Mini-Spec.v2026-08-28.md`
2. `docs/requirements/PRD.v2026-08-28.md`
3. `docs/requirements/PRD.v2026-08-27.1.md` 中未被覆盖的内容

## 1. 当前进度总览

| 阶段 | 状态 | 当前交付物或证据 | 下一步 |
|---|---|---|---|
| 需求基线 | 已完成 | 原始 PRD、2026-08-27 和 2026-08-27.1 版本 | 后续变更继续新建版本文档 |
| 视觉与 UX 交接 | 已完成 | Energetic 视觉决策、UX + UI Mini Spec | 在 RN 中建立统一主题 Token |
| 交互原型 | 已完成 | HTML 原型、独立扫描原型、原型测试 | 用原型作为 RN 页面验收参考 |
| 项目计划与目录整理 | 已完成 | 本文档 | 按阶段建立 RN 工程 |
| RN 工程骨架 | 待开始 | 当前没有 `package.json` 或 RN 工程配置 | 初始化 Android React Native 工程 |
| 本地数据与文件生命周期 | 待开始 | 当前没有 App 沙盒数据层 | 建立工程、页面和文件清理模型 |
| 原生扫描处理链路 | 待开始 | 当前没有 `android/` 原生模块 | 实现相机、边缘识别、透视、增强、PDF |
| RN 流程集成 | 待开始 | 当前没有 `src/` | 实现首页到导出的真实导航流程 |
| 自动化与真机验收 | 待开始 | 当前只有原型级 Node 测试 | 补齐 API 29+、真机和 20 页验收 |
| 发布准备 | 待开始 | 尚无构建、签名和发布配置 | 完成 Release 构建和隐私检查 |

### 1.1 当前已确认完成的内容

- MVP 范围已经明确：拍摄、相册导入、裁剪、增强、多页管理、PDF 导出、预览、分享和本地保存。
- 非目标已经明确：OCR、登录、云同步、会员、团队协作、远程埋点和远程崩溃上报。
- Android 最低建议版本为 Android 10 / API 29+。
- RN 与 Android 原生模块的职责边界已经定义。
- Energetic 视觉方向已正式取代上一版 Apple 风格白灰蓝方案。
- 当前原型覆盖首页、拍摄、权限、裁剪、增强、多页、导出和设置等页面地标。
- 原型测试已通过 4 项检查：
  - 页面地标存在。
  - 本地优先和沙盒保存文案存在。
  - 文档增删改、排序、增强和临时照片恢复模型存在。
  - HTML 中声明的交互动作均能在原型脚本中找到处理逻辑。

### 1.2 当前不能宣称已完成的内容

- 没有可运行的 React Native App。
- 没有 `android/` 工程、Gradle 配置或原生模块。
- 没有真实相机、相册权限、边缘识别、透视矫正、图像增强或 PDF 生成。
- 没有真实文件持久化、临时照片恢复和删除后资源清理。
- 没有系统预览、系统分享和日志导出实现。
- 没有 Android 真机测试、性能数据或 Release 构建结果。

## 2. 里程碑计划

### M0：需求与产品基线

**状态：已完成**

**交付物**

- 保留原始需求基线：`docs/requirements/PRD.md`
- 形成 2026-08-27 版本：`docs/requirements/PRD.v2026-08-27.md`
- 形成补充约束版本：`docs/requirements/PRD.v2026-08-27.1.md`
- 形成当前视觉覆盖版本：`docs/requirements/PRD.v2026-08-28.md`

**完成条件**

- 功能范围、非目标、平台版本、存储、隐私和验收范围可追溯。
- 后续需求变更不覆盖历史 PRD。

### M1：UX、UI 与交互原型

**状态：已完成**

**交付物**

- `docs/design/UX-UI-Mini-Spec.v2026-08-28.md`
- `prototype/visual/prototype_document-scanner-ux-energetic.html`
- `prototype/interactive/scan-ux/index.html`
- `prototype/interactive/scan-ux/app.js`
- `prototype/interactive/scan-ux/styles.css`
- `prototype/interactive/scan-ux/prototype.test.js`

**完成条件**

- 主流程可以从首页走到导出。
- 异常流程至少有权限拒绝、临时照片恢复、空文件名、PDF 重名和页面删除确认的交互表达。
- 原型级测试通过。

**已知缺口**

- 正式实现需要独立的系统分享入口。
- 首页文档卡片仍需补齐重命名和删除操作的最终形态。
- 多页排序交互需要确定长按拖拽和上移/下移按钮的组合方案。

### M2：RN 工程初始化

**状态：待开始**

**目标**

- 建立可运行的 Android React Native 工程。
- 确认 Node、JDK、Android SDK、Gradle、React Native 版本组合。
- 建立开发、测试和 Release 的最小命令集。

**完成条件**

- `npm start` 可以启动 Metro。
- `npm test` 和 `npm run lint` 有明确结果。
- `npm run android` 可以在至少一台 Android 设备或模拟器安装 Debug 包。
- 工程可以在 Android 10 / API 29+ 环境启动。

**进入下一阶段前必须确定**

- React Native 版本和依赖管理方式。
- 导航方案、UI 组件方案和手势方案。
- 最低支持 API、目标 API 和构建工具版本。

### M3：本地数据、文件存储与工程生命周期

**状态：待开始**

**目标**

- 建立 `Document`、`ScanPage` 和临时照片数据模型。
- 在 App 沙盒保存原图、处理图、缩略图和 PDF。
- 支持草稿、已导出、资源缺失和处理中等状态。
- 确保删除工程时清理关联资源，导出 PDF 不删除工程。

**完成条件**

- 首页可以读取并按最近更新时间倒序展示文档。
- 文档可以打开、重命名、删除、继续编辑和再次导出。
- 原图保留用于重新裁剪和增强。
- 未确认临时照片可以恢复或由用户放弃后清理。
- 文件名、重名和资源缺失均有稳定错误处理。

### M4：Android 原生扫描处理链路

**状态：待开始**

**目标**

- 实现相机预览、拍照和闪光灯。
- 实现相册单选、多选和选择顺序保留。
- 实现文档边缘检测、四角坐标返回和手动裁剪数据交换。
- 实现透视矫正、旋转、增强、灰度、黑白和 PDF 生成。
- 实现系统文件预览、分享和日志导出。

**建议接口**

```text
detectDocumentEdges(imagePath)
cropAndWarp(imagePath, corners)
enhanceImage(imagePath, mode)
createPdf(pageImagePaths, outputName, options)
shareFile(filePath)
openFile(filePath)
exportLogs()
```

**完成条件**

- 原生接口可以被 RN 调用，并返回结构化成功或失败结果。
- 失败不会破坏原图、当前工程或上一次成功的 PDF。
- 处理尺寸、压缩质量和 20 页 PDF 目标体积符合 PRD。
- 日志不包含标题、文件名、完整路径、图片内容或 PDF 内容。

### M5：RN 页面与真实流程集成

**状态：待开始**

**目标**

- 按原型实现首页、拍摄、权限、裁剪、增强、多页、导出和设置页面。
- 建立导航栈，保证返回时临时数据和当前文档上下文不丢失。
- 建立统一 Energetic 主题 Token 和组件状态。
- 接入原生模块、本地存储、文件操作和系统能力。

**页面顺序**

```text
首页
  -> 拍摄 / 相册导入
  -> 裁剪确认
  -> 图像增强
  -> 加入当前文档
  -> 多页管理
  -> PDF 导出
  -> 打开预览 / 系统分享
```

**完成条件**

- 单页流程可完成拍摄、裁剪、增强和导出。
- 多页流程可完成逐页确认、排序、删除、重新编辑和导出。
- 相册多选按选择顺序逐页处理。
- 权限拒绝、处理失败、空间不足、重名和导出失败均可恢复或重试。
- 导出后工程仍可继续编辑。

### M6：测试、性能与验收

**状态：待开始**

**目标**

- 建立 JavaScript/React Native 单元测试和组件测试。
- 建立 Android 原生模块测试。
- 执行真机和端到端验收。
- 覆盖正常光照、弱光、复杂背景和不同材料。

**最低验收范围**

- Android 10 / API 29+。
- 至少三类 Android 真机。
- A4、票据、卡片和手写内容。
- 单页和 20 页多页流程。
- 相册多选、权限拒绝、临时照片恢复。
- PDF 重名、预览、分享和导出失败恢复。
- 日志导出和敏感信息检查。

**完成条件**

- UX 验收清单全部通过。
- UI 验收清单全部通过。
- 没有阻塞主流程的崩溃、数据丢失或文件残留问题。
- 记录设备、系统版本、测试材料、结果和未覆盖风险。

### M7：Release 与交付

**状态：待开始**

**目标**

- 完成 Release 构建、签名、版本信息和安装验证。
- 检查权限声明、隐私说明和本地存储告知。
- 输出构建产物、测试报告和已知问题列表。

**完成条件**

- Release 包可以安装和启动。
- 关键流程在 Release 包中与 Debug 包行为一致。
- 不包含远程上传文档内容、远程埋点或远程崩溃上报。
- 文档和目录结构能让后续开发者快速定位模块。

## 3. 待确认事项与风险

| 优先级 | 事项 | 影响 | 建议处理时机 |
|---|---|---|---|
| 高 | React Native、JDK、Android SDK 和 Gradle 版本组合 | 影响工程初始化和后续原生模块编译 | M2 开始前 |
| 高 | 边缘检测和透视处理采用的 Android 技术方案 | 影响识别质量、性能和设备兼容 | M4 开始前 |
| 高 | 首页重命名、删除入口的最终交互 | 影响首页组件和导航 | M5 实现首页前 |
| 中 | 多页排序采用拖拽、上移/下移，还是两者并存 | 影响手势和可访问性 | M5 实现多页页面前 |
| 中 | 导出完成页固定展示“打开预览”和“分享”两个按钮 | 影响导出完成态 | M5 实现导出页前 |
| 中 | 权限拒绝使用独立页面还是底部弹层 | 影响权限流程和返回行为 | M5 实现拍摄页前 |
| 中 | 首页是否允许系统主题影响，扫描编辑页是否固定深色 | 影响主题 Token 和测试矩阵 | M2 主题设计时 |
| 高 | 真机、测试材料和弱光/复杂背景环境是否可用 | 影响 M6 验收排期 | M2 完成前确认 |

## 4. 目录整理

### 4.1 当前实际目录

当前仓库仍是“需求文档 + Web 原型”阶段，以下目录和文件已经存在：

```text
scan/
├── AGENTS.md
├── docs/
│   ├── design/
│   │   └── UX-UI-Mini-Spec.v2026-08-28.md
│   ├── planning/
│   │   └── PROJECT-PLAN.v2026-08-28.md
│   └── requirements/
│       ├── PRD.md
│       ├── PRD.v2026-08-27.md
│       ├── PRD.v2026-08-27.1.md
│       └── PRD.v2026-08-28.md
├── prototype/
│   ├── interactive/
│   │   └── scan-ux/
│   │       ├── app.js
│   │       ├── index.html
│   │       ├── prototype.test.js
│   │       └── styles.css
│   └── visual/
│       └── prototype_document-scanner-ux-energetic.html
└── .workbuddy/
    └── memory/
```

说明：

- `docs/requirements/` 保存需求和历史 PRD；历史版本不覆盖。
- `docs/design/` 保存 UX/UI 设计交接文档。
- `docs/planning/` 保存项目计划、进度和验收记录。
- `prototype/visual/` 保存视觉方向展示原型。
- `prototype/interactive/` 保存可交互原型和原型测试，不作为正式 App 运行时代码。
- `prototype/interactive/scan-ux/prototype.test.js` 是当前唯一可执行的自动化检查入口。
- `.workbuddy/` 属于工作环境目录，不纳入产品源码结构。
- 根目录存在 `.DS_Store` 时，应视为本机生成文件，不作为项目交付物。

### 4.2 RN 工程建立后的目标目录

以下是后续建议的目标结构。目录在对应阶段开始时再创建，当前不提前生成空目录：

```text
scan/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── jest.config.js
├── docs/
│   ├── design/
│   │   └── UX-UI-Mini-Spec.vYYYY-MM-DD.md
│   ├── planning/
│   │   └── PROJECT-PLAN.vYYYY-MM-DD.md
│   └── requirements/
│       ├── PRD.md
│       └── PRD.vYYYY-MM-DD[.N].md
├── prototype/
│   ├── visual/
│   │   └── prototype_document-scanner-ux-energetic.html
│   └── interactive/
│       └── scan-ux/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── navigation/
│   │   └── providers/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── PermissionScreen.tsx
│   │   ├── CropScreen.tsx
│   │   ├── EnhanceScreen.tsx
│   │   ├── PagesScreen.tsx
│   │   ├── ExportScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── ScannerCameraView.tsx
│   │   ├── CropEditor.tsx
│   │   ├── EnhancePreview.tsx
│   │   ├── PageReorderGrid.tsx
│   │   └── PdfExportStatus.tsx
│   ├── data/
│   │   ├── models.ts
│   │   ├── documentRepository.ts
│   │   └── fileStore.ts
│   ├── native/
│   │   └── scannerModule.ts
│   ├── theme/
│   │   ├── tokens.ts
│   │   └── theme.ts
│   ├── state/
│   ├── types/
│   └── utils/
├── android/
│   └── app/src/main/java/.../
├── ios/
│   └── ...
└── tests/
    ├── unit/
    ├── components/
    ├── integration/
    └── fixtures/
```

### 4.3 目录责任边界

| 目录 | 责任 | 不应放入 |
|---|---|---|
| `docs/requirements/` | 版本化需求和历史 PRD | 运行时代码 |
| `docs/design/` | UX/UI 设计规范和交接 | RN 正式页面 |
| `docs/planning/` | 项目计划、进度和验收记录 | 运行时代码 |
| `prototype/visual/` | 视觉方向展示原型 | RN 正式页面 |
| `prototype/interactive/` | 可交互原型和原型测试 | RN 正式页面 |
| `src/screens/` | 页面级布局、导航入口和页面状态 | Android 相机或图像算法 |
| `src/components/` | 可复用 UI 和交互组件 | 文档文件持久化细节 |
| `src/data/` | 文档模型、仓库和沙盒文件生命周期 | UI 视觉样式 |
| `src/native/` | RN 到原生模块的类型化调用封装 | 原生算法实现本体 |
| `src/theme/` | Energetic 语义 Token 和主题 | 页面内散落的硬编码色值 |
| `android/` | 相机、图像处理、PDF、系统分享和 Android 权限 | RN 页面布局 |
| `tests/` | 自动化测试、夹具和集成验证 | 临时手工测试脚本 |

## 5. 后续执行顺序

1. 确认 M2 的开发环境版本和 React Native 初始化方案。
2. 初始化 RN 工程，先让空壳 App 在 Android 10 / API 29+ 启动。
3. 建立本地文档模型和文件生命周期，再接入首页与多页页面。
4. 先打通一条真实的“拍照 -> 裁剪 -> 增强 -> 单页 PDF”链路。
5. 补齐多页、相册多选、重新编辑、重名和恢复流程。
6. 接入系统预览、分享、日志导出和权限异常状态。
7. 执行真机、性能和 20 页验收，最后再做 Release 构建。

## 6. 当前验收与记录入口

当前可以执行的检查：

```bash
node prototype/interactive/scan-ux/prototype.test.js
```

截至 2026-08-28，该命令通过 4 项原型检查。RN 工程建立后，应在 `package.json` 中补充并统一以下命令：

```bash
npm start
npm test
npm run lint
npm run android
```

在 M6 完成前，测试报告至少应记录：

- 设备型号和 Android 版本。
- 测试材料类型和拍摄环境。
- 单页、多页、相册、权限、恢复、导出和分享结果。
- 处理耗时、内存和 20 页 PDF 体积。
- 未覆盖的风险和复现步骤。
