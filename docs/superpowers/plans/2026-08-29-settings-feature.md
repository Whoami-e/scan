# 设置功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 PRD 在 React Native App 中实现轻量设置页、本地日志导出和首页到设置页的完整交互。

**Architecture:** 新增纯展示/交互的 `SettingsScreen`，由 `App` 负责导航和系统分享调用；新增纯函数日志模块负责非敏感过滤与 7 天/5MB 保留策略。日志导出使用原生 `scannerModule.exportLogs`，若原生能力尚未接入则展示可理解的错误反馈。

**Tech Stack:** React Native 0.87、TypeScript、react-native-paper、Jest。

**Spec:** `docs/requirements/PRD.v2026-08-27.1.md` 第 5.7、7.2、8.5、9.2 节及 `docs/design/UX-UI-Mini-Spec.v2026-08-28.md` 第 4.7 节。

## Global Constraints

- 设置页不出现登录、云同步、会员、主题切换或复杂配置入口。
- 日志仅保留最近 7 天或 5MB，且不得包含文档标题、文件名、完整路径、图片内容或 PDF 内容。
- PDF、扫描工程和日志默认留在 App 沙盒，不申请额外敏感权限。
- 继续沿用 Energetic 视觉 token，不在页面散落颜色值。

### Task 1: 日志策略模块

**Files:**
- Create: `src/data/localLogStore.ts`
- Test: `tests/unit/localLogStore.test.ts`

**Interfaces:**
- Produces `sanitizeLogDetails(details)`, `appendLog(entries, entry, now)`, `serializeLogs(entries)` 和 `MAX_LOG_BYTES`，供设置页及后续运行日志调用。

- [ ] 写失败测试：敏感字段被过滤、7 天前日志被清理、5MB 上限截断、序列化不含文档内容。
- [ ] 运行 `npx jest tests/unit/localLogStore.test.ts --runInBand` 确认失败。
- [ ] 实现纯函数和常量。
- [ ] 再次运行同一测试确认通过。

### Task 2: 设置页面

**Files:**
- Create: `src/screens/SettingsScreen.tsx`
- Test: `__tests__/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes `onBack?: () => void` 和 `onExportLogs?: () => void`。
- Renders PRD 规定的本地保存、卸载提醒、日志说明、导出按钮和版本号。

- [ ] 写失败测试：关键文案、返回和导出回调、无非目标入口。
- [ ] 运行测试确认失败。
- [ ] 使用现有 theme token 和 Paper 控件实现页面。
- [ ] 运行测试确认通过。

### Task 3: App 导航与导出接线

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/native/scannerModule.ts`（复用既有 `exportLogs` 契约，无需改变签名）
- Test: `__tests__/AppFlow.test.tsx`

**Interfaces:**
- Home 的 `onSettings` 进入设置页；设置页返回首页；点击导出日志调用 `scannerModule.exportLogs()` 并用 Alert 反馈成功/失败。

- [ ] 扩展 AppFlow 失败测试覆盖设置导航和导出日志调用。
- [ ] 运行测试确认失败。
- [ ] 接入 `SettingsScreen`、screen union 和异步错误处理。
- [ ] 运行 `npm test -- --runInBand` 与 `npm run lint`。
