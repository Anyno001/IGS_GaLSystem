# Immersive Galgame System 协作规则

本文件适用于当前独立仓库。不得假设旧仓库、本机绝对路径或外部工具箱发布壳存在。

## 项目边界

- `app/` 是主程序；`loader/` 只负责远程 bundle loader 和酒馆助手导入件。
- `app/dist/` 是正式运行时发布内容，loader 依赖其中的自包含 bundle、样式、manifest 和素材。
- `app/tests/`、`app/fixtures/` 和 `docs/` 必须保持可重复、可脱敏、可公开审阅。
- 不新增外部工具箱发布壳、旧计划、过程记录、阶段性截图或历史 loader 副本。
- 不提交 API key、cookie、token、私人聊天记录、真实数据库、本机私有路径或未授权用户资源。

## 修改前

先读取 `README.md`、本文件、`docs/AI_WORKFLOW.md`，再读取目标模块的 `CONTRACT.md`、相关测试和 `docs/PACKAGING_WORKFLOW.md`。跨模块改动先搜索入口、调用者、状态流和持久化边界。

## 风险与验证

- 文档、结构和 fixtures 修改：核对相关说明与引用。
- 运行逻辑修改：按实际风险选择已有行为用例，使用 `node --test tests/<文件>.test.js` 定向验证。
- loader、dist、版本或发布链修改：构建后核对 loader、实际下载产物与启动行为，不以构建成功代替启动。
- 真实酒馆、真实 provider、真实用户数据和不可逆 Git/远端操作：先用 fake host/fixtures 验证，必须得到维护者明确确认。

已同步删除结构、静态、性能门禁及批量测试入口，不重建等价全量运行器，不以 skip/todo 隐藏失败。保留行为、兼容、安全、异步生命周期和加载启动回归，见 `app/tests/README.md`。构建与预览命令保留，失败命令不得宣称通过。

## 发布规则

`app/package.json`、`app/src/core/bootstrap.js`、`app/dist/manifest.json`、bundle 和当前版本 loader 必须同步。loader JSON 的 `content` 必须来自 loader 源原文。调试 loader 不属于正式发布件；被测试契约引用的固定版 loader 在完成替代验证前不得删除。

当前远端为公开仓库 `https://github.com/Anyno001/IGS_GaLSystem`，远端名称使用 `origin`。初始化、提交和推送前必须审计首提交内容；push 与 tag 分离，真机验收通过前不创建版本 tag。

## 完成报告

报告必须列出修改文件、风险级别、真实验证与 skipped 项、Git/远端状态、是否新增抽象以及残余风险。没有执行的操作必须明确写为未执行。
