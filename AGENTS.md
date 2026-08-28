# Repository Guidelines

## 项目结构与模块组织

当前仓库以产品需求文档和 Web 原型为主，暂无 React Native 源码或原生 Android 工程：

- `docs/requirements/PRD.md`：原始 MVP 需求基线。
- `docs/requirements/PRD.vYYYY-MM-DD.md`：按日期保存的需求版本。
- `docs/requirements/PRD.v2026-08-27.1.md`：当前较新的需求修订版，包含本地存储、日志、测试范围等补充约束。
- `docs/design/`：UX/UI 设计交接文档。
- `docs/planning/`：项目计划和进度文档。
- `prototype/visual/`：视觉方向展示原型。
- `prototype/interactive/`：可交互原型和原型测试。

新增功能实现后，建议按 React Native 常见结构分别放入 `src/`、`android/` 和 `ios/`，但在对应工程建立前不要预设具体路径或脚本。

## 构建、测试与开发命令

当前 checkout 没有 `package.json`、Gradle 配置或测试脚本，因此暂时没有可运行的构建命令。实现工程加入后，应以 `package.json` 和原生工程配置为准，并在此补充实际命令，例如：

- `npm start`：启动 Metro。
- `npm test`：运行 JavaScript/React Native 测试。
- `npm run lint`：执行项目 lint。
- `npm run android`：构建并安装 Android 开发包。

文档变更至少应检查 Markdown 标题、代码块和相对路径是否正确。

## 编码风格与命名约定

文档使用 Markdown，标题层级连续，列表保持短句，命令、路径、字段名使用反引号。PRD 新版本文件放在 `docs/requirements/`，使用 `PRD.vYYYY-MM-DD[.N].md` 命名；不要覆盖历史版本。技术实现应保持 RN 页面流程与 Android 原生扫描、图像处理、PDF 生成模块边界清晰，平台无关接口使用动词加对象命名，如 `detectDocumentEdges`、`createPdf`。

## 测试指南

当前没有自动化测试框架或覆盖率要求。MVP 验收应至少覆盖 Android 10/API 29、三类真机、单页与 20 页多页流程、相册多选、权限拒绝、临时照片恢复、PDF 重名和日志导出；测试材料应包括 A4、票据、卡片和手写内容，并覆盖正常光照、弱光和复杂背景。

## 提交与 Pull Request

当前目录不是 Git 仓库，无法从历史提交确认既有约定。暂定使用 Conventional Commits，例如 `docs: update scanner MVP PRD`、`feat: add document crop flow`。PR 应说明需求版本、行为变化、测试设备与结果；涉及 UI 时附截图或录屏，并明确未覆盖的风险。

## 安全与配置

扫描图片、PDF 和工程数据默认保存在 App 沙盒，不上传文档内容。日志只能记录非敏感运行信息，不得包含标题、文件名、完整路径、图片或 PDF 内容。新增远程统计、崩溃上报或权限时，必须同步补充隐私策略和用户告知。
