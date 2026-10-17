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

## 可选 Live2D 内嵌导入件

在 `app/` 下运行 `npm.cmd run package:standalone`：先构建当前 dist 和 loader，再生成 `loader/igs-live2d-standalone.js`、`loader/IGS-Live2D-导入即用-v0.36.75.json` 与 SHA256 清单。`npm.cmd run build:standalone` 只打包现有 dist，不代替构建。

- 前端、CSS 与 fflate 0.8.2 同步解压器内嵌，不依赖 CMD、Node.js、本地 18086 服务或远端前端下载；失败不回退到官方 main。
- 默认音乐、字体、地图、皮肤与背景仍来自固定上游提交；SDK 也需网络。素材基准由 `app/scripts/build-standalone.js` 的 `ASSET_REF` 声明，升级素材时应单独审阅，不标注为完全离线包。
- 复用现有启动器的版本校验、安全关闭、单实例与 Gal模拟/魔法棒入口。损坏的内嵌配置在替换旧实例之前拒绝；固定版 loader 忽略遗留内嵌配置。
- 内嵌 JSON 默认停用，`content` 必须与生成 JS 逐字一致。不重新打包历史下载，不分发 Cubism Core 或人物模型。
- 仅本地调试可用 `启动Live2D前端.cmd` 与 `loader/IGS-Live2D-本地测试.json`；服务仅监听回环地址、只读 dist。两个 Live2D 导入件及原自动更新件不可同时启用。
- 定向运行 Live2D、loader 和 standalone 行为回归，验证实际导入件启动、关闭及重新启用；真实酒馆和手机验收需另行执行，不恢复批量门禁。

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
