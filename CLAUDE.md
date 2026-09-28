# CLAUDE.md

本文件是当前独立仓库的开发说明，不引用旧仓库路径。

## 目录

- 源码：`app/src/`
- 测试：`app/tests/`
- fixtures：`app/fixtures/`
- 构建脚本：`app/scripts/`
- 发布产物：`app/dist/`
- loader：`loader/`
- 当前文档：`docs/`

## 命令

在 `app/` 目录使用 Windows 兼容的 `npm.cmd`：

- `npm.cmd run structure`
- `npm.cmd run static`
- `npm.cmd test`
- `npm.cmd run simulate`
- `npm.cmd run perf`
- `npm.cmd run build`
- `npm.cmd run build:loader -- --release vX.Y.Z`
- `npm.cmd run gate`

## 版本与 loader

版本以 `app/package.json` 为入口，构建后必须与 `app/dist/manifest.json` 和 bundle 注释一致。`loader/igs-loader.json` 与版本化自动更新 JSON 的 `content` 必须来自 `loader/igs-loader.js` 原文。`igs-loader-debug.*` 仅用于本地诊断，不作为正式发布件。固定版 loader 是兼容性产物，若测试契约引用它，替换前必须同步修改测试并运行完整门禁。

loader 当前使用已确认的公开仓库 `Anyno001/IGS_GaLSystem`；不得回退到旧仓库地址。Git 初始化、commit 和 push 前必须审计首提交内容；真机验收前不打 tag。

## 风格与测试

使用 ES Module 和 Node 原生 test runner；测试名使用 `gate:` 前缀。优先复用已有入口、helper、registry 和状态流，不在入口文件堆业务逻辑。修改后检查死分支、重复常量、未使用代码和跨层依赖。
