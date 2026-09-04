# FairScan 集成验收记录

## 自动化闸门

- Jest：全量 `npm test -- --runInBand`。
- Android JVM：`:app:testDebugUnitTest`。
- Android 仪器：文档检测、模型分割、实时稳定、增强、recipe 重渲染、PDF 导出。
- Release：`:app:assembleRelease` 自动执行 `scripts/verify-release-contents.sh`。
- 许可证：`scripts/verify-third-party-notices.sh`。
- 日志隐私：`scripts/verify-log-privacy.sh`。

## 手工设备矩阵

| 设备 | API | 相机/相册 | 弱光/复杂背景 | 20 页/PDF | 权限拒绝恢复 | 结果 |
|---|---:|---|---|---|---|---|
| Android 真机 A | 29 | 待执行 | 待执行 | 待执行 | 待执行 | 待验收 |
| Android 真机 B | 33 | 待执行 | 待执行 | 待执行 | 待执行 | 待验收 |
| Android 真机 C | 35 | 待执行 | 待执行 | 待执行 | 待执行 | 待验收 |

材料覆盖 A4、收据、卡片和手写页面；每台设备需记录自动/手动裁剪、旋转、四种滤镜、排序、删除、重编辑、后台恢复、预览和分享。模型缺失或哈希错误时应看到 `opencv` 或 `fallback`，且仍能导出 A4、10mm 白边 PDF。

## 追溯入口

FairScan 上游文件清单见 `docs/third-party/fairscan-sources.md` 与 `android/app/src/main/java/com/scanapp/fairscan/SOURCE-MANIFEST.md`；模型 URL、版本、SHA-256 和许可证见 `docs/third-party/fairscan-model.md`。发行包中的 `assets/LICENSE` 和 `assets/NOTICE` 由 Gradle 从根目录同步。
