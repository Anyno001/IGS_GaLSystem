# 构建与发布流程

## 发布内容

发布边界是运行源码、必要测试与 fixtures、构建脚本、必要素材及许可证、`app/dist/`、当前 loader 和当前版本中文导入 JSON。阶段性计划、过程 Markdown、截图、历史 loader、复现脚本和本机资料不进入新仓库。

## 本地构建

在 `app/` 目录执行：

1. 按变更选择已有行为用例：`node --test tests/<相关文件>.test.js`。
2. `npm.cmd run build`
3. `npm.cmd run build:loader -- --release vX.Y.Z`

结构、静态、性能门禁及批量测试入口已删除，不恢复等价全量运行器。构建与行为验证分开；构建后按需运行 `tests/gate-contract.test.js`、`tests/loader-version.test.js` 验证加载、版本与实际 bundle 启动。

`build` 会生成自包含的 `app/dist/igs.bundle.js`、`app/dist/igs.bundle.css`、`manifest.json`，并复制运行时字体、地图素材和许可证。`build:loader` 会从 `loader/igs-loader.js` 生成 `igs-loader.json`、调试 loader 和按需生成的版本化自动更新 JSON。

## 一致性要求

- `app/package.json`、`app/dist/manifest.json` 和 bundle 版本必须一致。
- `loader/igs-loader.json` 的 `content` 必须与 `loader/igs-loader.js` 原文完全一致。
- 当前版本化自动更新 JSON 必须与 `igs-loader.json` 对象一致。
- loader 必须引用公开可访问的 `app/dist/igs.bundle.js` 与 `app/dist/igs.bundle.css`。
- 调试 loader 不作为正式导入件；固定版 loader 若被测试契约引用，不得直接删除。
- fixtures 不得包含疑似真实密钥、Bearer token、cookie 或私人数据。

## 加载与核验

- 正式 loader 只指向 `Anyno001/IGS_GaLSystem`。自动版读取 main 提交；CDN 加载失败时从 GitHub 下载同一提交，不回退其他版本。
- `--release vX.Y.Z` 生成同版本命名的自动更新导入件，不创建 tag；`--pin` 仅在明确需要固定版时使用，内部 `PINNED_REF` 不受页面遗留配置覆盖。
- 启动器源码变化后，旧用户需要重新导入一次；只刷新页面不会替换旧启动器代码。
- 推送后核对远端提交，下载该提交的 manifest、bundle 和 loader，与本地逐字节比较并执行下载的 bundle。Node 冷启动、关闭和重启不等于真实酒馆、浏览器 DOM、手机或 provider 验收。
- 内测增量同步不搬运历史计划、过程日志和截图，保留正式仓库 README、许可证与下载历史；运行源码、必要测试、资源输入和加载器修复必须同步。

## Git 与远端

新仓库必须先确认 `git rev-parse --show-toplevel`、目标 GitHub 地址、远端名称和可见性。不得把旧仓库 `origin` 自动带入新仓库。只有维护者明确授权后，才初始化独立 Git、审计首提交、配置 remote、commit 和 push；push 与 tag 分开，真机验收前不打 tag。
