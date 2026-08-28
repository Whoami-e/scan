# 文档扫描 App

这是一个 Android 优先的文档扫描 App MVP 项目，使用 React Native Community CLI + TypeScript 初始化。当前仓库已经具备 RN Android/iOS 工程骨架和最小首页，但相机、边缘识别、图像处理和 PDF 生成等核心原生能力仍待实现。

## 当前状态

- 需求基线已整理完成。
- Energetic 视觉方向已确认。
- Web 评审原型已完成。
- 可交互原型包含基础流程测试。
- RN 工程骨架已初始化：React Native `0.87.1`、TypeScript、Android 和 iOS 原生工程。
- `src/` 已建立页面、主题、数据模型和原生接口的最小分层。
- Android 原生扫描、图像处理和 PDF 生成能力待实现。

当前可以把本仓库作为 RN 工程继续开发，但不能把它当作功能完整的扫描 App 使用。相机、相册、裁剪、增强、PDF 和分享流程尚未接入。

## MVP 范围

MVP 目标是让用户无需登录即可把纸质文档转换成清晰、规整、可分享的 PDF。

核心能力包括：

- 拍摄文档。
- 从相册导入图片，支持多选。
- 自动识别文档边缘。
- 手动调整四角裁剪范围。
- 透视矫正和基础图像增强。
- 支持原图、增强、灰度、黑白模式。
- 多页管理、排序、删除和重新编辑。
- 导出 A4 PDF，默认 10mm 白边。
- 导出后打开预览和系统分享。
- 本地历史文档列表管理。
- App 沙盒内保存扫描工程和 PDF。

MVP 不包含：

- OCR。
- 登录、注册和云同步。
- 会员付费。
- 团队协作。
- 远程埋点。
- 远程崩溃上报。

## 项目目录

```text
scan/
├── AGENTS.md                         # 本仓库的协作、编码和验证约定
├── README.md                         # 项目总览、目录说明和开发命令
├── App.tsx                           # RN 根入口，只负责装配 src/app/App
├── app.json                          # React Native 应用名称和显示名称
├── package.json                      # 依赖、脚本和 Node 版本约束
├── package-lock.json                 # npm 依赖锁定文件
├── babel.config.js                   # Babel 转译配置
├── metro.config.js                   # Metro 打包器配置
├── tsconfig.json                     # TypeScript 编译配置
├── jest.config.js                    # Jest 测试配置
├── .eslintrc.js                      # ESLint 代码检查配置
├── android/                          # Android 原生工程和后续扫描模块
│   ├── app/                          # Android App 模块、Manifest 和资源
│   ├── build.gradle                  # Android 全局构建版本配置
│   └── gradlew                       # Gradle Wrapper，可固定构建工具版本
├── ios/                              # iOS 原生工程，为后续跨平台扩展预留
├── src/                              # 正式 React Native 业务代码
│   ├── app/                          # 应用级装配、导航和全局 Provider
│   │   └── App.tsx                   # 当前启动首页；后续挂载导航容器
│   ├── screens/                      # 页面级布局和页面状态
│   │   └── HomeScreen.tsx            # 首页空状态和开始扫描入口骨架
│   ├── components/                   # 可复用 UI 和交互组件
│   │   └── PrimaryButton.tsx          # 扫描主流程按钮
│   ├── data/                         # 业务模型、仓库和沙盒文件生命周期
│   │   ├── models.ts                 # Document、ScanPage 和裁剪数据模型
│   │   └── fileStore.ts              # App 沙盒文件存储接口占位
│   ├── native/                       # RN 到 Android/iOS 原生模块的类型化接口
│   │   └── scannerModule.ts           # 相机、检测、裁剪、增强、PDF 和分享契约
│   └── theme/                        # Energetic 视觉 Token 和主题出口
│       ├── tokens.ts                 # 颜色、间距、圆角和字号 Token
│       └── theme.ts                  # 页面统一使用的主题对象
├── tests/                            # 与页面目录分离的业务单元测试
│   └── unit/
│       └── models.test.ts             # 纯 TypeScript 数据模型测试
├── __tests__/                        # RN 脚手架入口和组件渲染测试
│   └── App.test.tsx                  # 根组件最小渲染测试
├── docs/
│   ├── requirements/                 # 版本化 PRD 和历史需求基线
│   │   ├── PRD.md
│   │   ├── PRD.v2026-08-27.md
│   │   ├── PRD.v2026-08-27.1.md
│   │   └── PRD.v2026-08-28.md
│   ├── design/                       # UX/UI 设计交接文档
│   │   └── UX-UI-Mini-Spec.v2026-08-28.md
│   └── planning/                     # 项目计划、阶段状态和验收范围
│       └── PROJECT-PLAN.v2026-08-28.md
└── prototype/                        # Web 原型，不是正式 App 运行时代码
    ├── visual/                       # Energetic 视觉方向展示原型
    │   └── prototype_document-scanner-ux-energetic.html
    └── interactive/                  # 可交互原型和原型级测试
        └── scan-ux/
            ├── app.js
            ├── index.html
            ├── prototype.test.js
            └── styles.css
```

### 目录职责边界

- `src/screens/`：只放页面布局、页面状态和用户流程入口，不放 Android 相机或图像算法。
- `src/components/`：只放可复用的 UI 和交互组件，不直接操作文档文件。
- `src/data/`：负责 `Document`、`ScanPage` 和 App 沙盒文件生命周期。
- `src/native/`：负责 RN 调用原生能力时的类型和错误边界，算法本体放在 `android/` 或 `ios/`。
- `src/theme/`：集中维护 Energetic 视觉 Token，页面不要散落硬编码颜色。
- `android/`：负责 Android 相机、边缘识别、透视矫正、图像增强、PDF、分享和权限。
- `ios/`：当前主要作为后续 iOS 扩展的原生工程基础，不能假设 Android 代码可以直接复用。
- `tests/`：放平台无关的业务单元测试、组件测试和集成测试夹具。
- `prototype/`：只用于需求、设计和交互评审，不作为生产代码导入 `src/`。

## 文档入口

建议按以下顺序阅读：

1. `docs/planning/PROJECT-PLAN.v2026-08-28.md`
2. `docs/requirements/PRD.v2026-08-28.md`
3. `docs/design/UX-UI-Mini-Spec.v2026-08-28.md`
4. `prototype/interactive/scan-ux/index.html`
5. `prototype/visual/prototype_document-scanner-ux-energetic.html`

历史需求版本保存在 `docs/requirements/`，不要覆盖旧版本。新增需求、新决策或验收口径变化时，创建新的版本文档。

## 原型

当前有两类原型：

- `prototype/visual/`：视觉方向展示原型，用于确认 Energetic 视觉风格。
- `prototype/interactive/`：可交互原型，用于验证页面地标、基础流程和关键文案。

可直接在浏览器打开：

```text
prototype/interactive/scan-ux/index.html
```

## 当前可运行检查

首次安装依赖：

```bash
npm install
```

启动 Metro：

```bash
npm start
```

运行 JavaScript/React Native 测试：

```bash
npm test
```

执行代码检查：

```bash
npm run lint
```

启动 Android Debug 包：

```bash
npm run android
```

`npm run android` 需要本机已安装 Android SDK，并配置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT`。当前工作环境尚未配置这两个变量，因此只能先完成 JavaScript 校验，不能据此宣称 Android 真机或模拟器构建通过。

原型测试仍然可以单独执行：

目的：验证交互原型的页面地标、关键文案和声明的交互动作是否仍然完整。

```bash
node prototype/interactive/scan-ux/prototype.test.js
```

## 当前工程约定

- React Native：`0.87.1`
- 应用显示名称：`文档扫描`
- Android 应用标识：`com.scanapp`
- Android 最低版本：API `29`，对应 Android 10
- Node：`>= 22.11.0`
- 页面和业务注释默认使用中文，原生库或脚手架约定保留其必要的英文注释。
- 新增原生能力时，先在 `src/native/` 定义类型化接口，再实现 Android/iOS 平台代码。
- 日志只能记录非敏感运行信息，不得记录标题、文件名、完整路径、图片或 PDF 内容。

## 后续开发方向

后续建议按以下顺序推进：

1. 接入导航和页面级扫描流程。
2. 实现本地文档模型和 App 沙盒文件生命周期。
3. 打通单页扫描、裁剪、增强和 PDF 导出链路。
4. 补齐多页、相册多选、排序、重名、恢复和失败处理。
5. 完成系统预览、系统分享和日志导出。
6. 做 Android 10 / API 29+、三类真机和 20 页 PDF 验收。

## 安全与隐私原则

- 扫描图片、PDF 和工程数据默认保存在 App 沙盒。
- 不上传文档内容。
- 日志只能记录非敏感运行信息。
- 日志不得包含文档标题、文件名、完整路径、图片内容或 PDF 内容。
- 如后续新增远程统计、崩溃上报或权限，必须同步补充隐私策略和用户告知。

## 贡献约定

- 默认使用中文维护需求和项目文档。
- Markdown 标题层级保持连续。
- 路径、命令、字段名使用反引号。
- PRD 新版本使用 `PRD.vYYYY-MM-DD[.N].md` 命名，并放入 `docs/requirements/`。
- 不覆盖历史 PRD。
- 当前尚无 Git 提交历史约定，暂定使用 Conventional Commits，例如 `docs: update project readme`。
