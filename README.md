# Immersive Galgame System

SillyTavern 酒馆助手脚本，提供视觉小说阅读器、场景素材、AI 图片生成集成和统一设置面板。

当前源码版本：`0.29.4`

## 仓库边界

- `app/src/`：运行源码。
- `app/tests/`：Node 原生测试与模拟测试。
- `app/fixtures/`：脱敏测试数据、素材和许可证相关 fixtures。
- `app/scripts/`：结构门禁、静态门禁、构建和性能检查。
- `app/dist/`：可由远程 loader 加载的自包含 bundle、样式、manifest 和运行时素材。
- `loader/`：酒馆助手导入件与 loader 源码。
- `docs/`：当前仓库的验证与发布说明，不保存阶段性截图、旧计划或本机路径。

不迁移外部工具箱的发布壳、旧仓库计划、过程记录、阶段性截图或历史自动更新副本；本仓库只保留运行所需源码、测试、fixtures、构建脚本、发布产物和当前文档。

## 本地验证

在 `app/` 目录执行：

- `npm.cmd run structure`
- `npm.cmd run static`
- `npm.cmd test`
- `npm.cmd run simulate`
- `npm.cmd run perf`
- `npm.cmd run build`
- `npm.cmd run build:loader -- --release v0.29.4`
- `npm.cmd run gate`

`app/dist/igs.bundle.js` 必须是自包含 bundle，不能在运行时导入 `app/src/`。测试 fixtures 不得包含真实 API key、cookie、token 或私人数据。

## 发布边界

正式导入件包括 `loader/igs-loader.json` 和当前版本化的中文自动更新 JSON。`loader/igs-loader-debug.*` 只供本地调试，不属于正式发布件；固定版 `沉浸式Galgame系统 v0.23.21.json` 暂保留作为既有兼容性门禁 fixture，移除前必须同步修改并验证门禁契约。

loader 当前指向公开仓库 `https://github.com/Anyno001/IGS_GaLSystem`，通过 jsDelivr 加载 `app/dist/`。本项目使用独立 Git 仓库；远端操作必须先审计首提交内容并确认地址。push 与 tag 分离，真机验收前不创建版本 tag。

## 许可证与素材

源码仓库未发现根级 `LICENSE`/`COPYING` 文件，因此本次迁移没有擅自声明项目许可证。字体和素材随源码及构建产物保留其现有许可证文件；正式公开前需要由维护者确认项目许可证和第三方素材授权边界。
