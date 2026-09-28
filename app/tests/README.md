# tests

本目录存放 app 主工程的模拟测试与回归测试。

## 测试范围

测试覆盖 host 输入、scene 解析、visual mode、prompt adapter、公开 API、导入契约、样式槽位、reader bridge、fake TavernHelper 闭环、fake shujuku 刷新、资源缓存和生图模式切换。

测试优先使用模拟环境。当前项目不要求安装版实机验收；如需真实酒馆或真实 provider 验证，必须由用户单独确认。

模拟测试矩阵见 `../../docs/SCHEMA_AND_FIXTURES.md`。

## 当前测试入口

```text
npm.cmd test
npm.cmd run simulate
npm.cmd run gate
```

当前已落地：

- `unit.test.js`：host 输入、scene 解析、visual mode、prompt adapter、公开 API。
- `gate-contract.test.js`：导入契约、样式槽位和 reader bridge。
- `simulate.test.js`：fake TavernHelper 最小闭环、fake shujuku 刷新、资源缓存和生图模式切换。
