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

- `node --test tests/<相关文件>.test.js`
- `npm.cmd run build`
- `npm.cmd run build:fonts`
- `npm.cmd run build:loader -- --release vX.Y.Z`
- `npm.cmd run package:loader`
- `npm.cmd run preview:records`

## 版本与 loader

版本以 `app/package.json` 为入口，与 `bootstrap.js`、构建后的 manifest 和 bundle 一致。自动更新 JSON 的 `content` 必须来自 `loader/igs-loader.js` 原文；`--release vX.Y.Z` 生成同版本命名的自动更新导入件，不创建 tag。固定版仅由 `--pin` 按需生成，通过内部 `PINNED_REF` 锁定，不回退其他版本。`igs-loader-debug.*` 仅供本地诊断。

loader 当前使用已确认的公开仓库 `Anyno001/IGS_GaLSystem`；不得回退到旧仓库地址。Git 初始化、commit 和 push 前必须审计首提交内容；真机验收前不打 tag。

## 风格与测试

使用 ES Module 和 Node 原生 test runner；测试名使用 `gate:` 前缀。优先复用已有入口、helper、registry 和状态流，不在入口文件堆业务逻辑。修改后检查死分支、重复常量、未使用代码和跨层依赖。

已删除结构、静态、性能门禁及批量测试入口，不重建等价全量运行器。保留真实行为、兼容、安全与生命周期回归，移除源码字面量和样式排布断言；失败先核对当前契约，不用 skip/todo 隐藏，也不改正确业务行为迎合旧断言。
