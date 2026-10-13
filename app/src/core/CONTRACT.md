# core 模块契约

## 职责

- 启动 IGS 主程序。
- 创建事件总线、状态仓库、生命周期管理器。
- 管理桌面/移动端全局能力检测。
- 协调 `host`、`scene`、`visual`、`presets`、`registry` 等模块初始化顺序。

## 禁止

- 不直接读写 shujuku 表格。
- 不直接操作具体 UI 组件 DOM。
- 不直接解析楼层正文业务规则。

## 对外契约

- 提供 `bootstrapIGS(options)`。
- 提供 `destroyIGS()`。
- 触发 `igs:ready`、`igs:destroy`、`igs:error` 事件。

v0.36.43：保持 `IGS.destroy()` / `destroyIGS()` 的同步结果契约，调用即停用并解绑公共 API；新增 `IGS.shutdown()`，返回幂等 Promise，等待各清理步骤、媒体日志/回收和缓存连接关闭，成功为 `{ok:true}`，失败为 `{ok:false,reason,error}`。单个清理步骤失败不能跳过后续关闭步骤。重载必须等待 `shutdown()` 成功，不能在旧媒体所有者收尾期间启动新实例。
