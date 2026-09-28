# Schema 与 fixtures 说明

`app/fixtures/` 只保存可重复运行的脱敏输入，用于约束导入 bundle、旧设置兼容、视觉结构、地图、素材和 API 形状。fixture 不代表真实用户数据，也不能写入真实凭据。

新增或修改 schema 时：

1. 在对应 `app/src/**/CONTRACT.md` 记录稳定边界。
2. 增加最小 fixture，覆盖成功、拒绝或兼容路径。
3. 在 `app/tests/` 增加以 `gate:` 开头的断言。
4. 运行 `npm.cmd run static`、相关测试和 `npm.cmd run simulate`。

测试失败时保留真实失败信息和待处理风险，不用扩大 fixtures 来掩盖契约变化。
