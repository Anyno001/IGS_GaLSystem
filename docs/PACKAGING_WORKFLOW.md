# 构建与发布流程

## 发布内容

发布边界是运行源码、必要测试与 fixtures、构建脚本、必要素材及许可证、`app/dist/`、当前 loader 和当前版本中文导入 JSON。阶段性计划、过程 Markdown、截图、历史 loader、复现脚本和本机资料不进入新仓库。

## 本地构建

在 `app/` 目录执行：

1. `npm.cmd run structure`
2. `npm.cmd run static`
3. `npm.cmd test`
4. `npm.cmd run simulate`
5. `npm.cmd run perf`
6. `npm.cmd run build`
7. `npm.cmd run build:loader -- --release vX.Y.Z`

`build` 会生成自包含的 `app/dist/igs.bundle.js`、`app/dist/igs.bundle.css`、`manifest.json`，并复制运行时字体、地图素材和许可证。`build:loader` 会从 `loader/igs-loader.js` 生成 `igs-loader.json`、调试 loader 和按需生成的版本化自动更新 JSON。

## 一致性要求

- `app/package.json`、`app/dist/manifest.json` 和 bundle 版本必须一致。
- `loader/igs-loader.json` 的 `content` 必须与 `loader/igs-loader.js` 原文完全一致。
- 当前版本化自动更新 JSON 必须与 `igs-loader.json` 对象一致。
- loader 必须引用公开可访问的 `app/dist/igs.bundle.js` 与 `app/dist/igs.bundle.css`。
- 调试 loader 不作为正式导入件；固定版 loader 若被测试契约引用，不得直接删除。
- fixtures 不得包含疑似真实密钥、Bearer token、cookie 或私人数据。

## Git 与远端

新仓库必须先确认 `git rev-parse --show-toplevel`、目标 GitHub 地址、远端名称和可见性。不得把旧仓库 `origin` 自动带入新仓库。只有维护者明确授权后，才初始化独立 Git、审计首提交、配置 remote、commit 和 push；push 与 tag 分开，真机验收前不打 tag。
