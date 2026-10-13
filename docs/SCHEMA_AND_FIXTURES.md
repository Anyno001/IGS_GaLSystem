# Schema 与 fixtures 说明

`app/fixtures/` 只保存可重复运行的脱敏输入，用于约束导入 bundle、旧设置兼容、视觉结构、地图、素材和 API 形状。fixture 不代表真实用户数据，也不能写入真实凭据。

新增或修改 schema 时：

1. 在对应 `app/src/**/CONTRACT.md` 记录稳定边界。
2. 增加最小 fixture，覆盖成功、拒绝或兼容路径。
3. 在 `app/tests/` 增加以 `gate:` 开头的断言。
4. 运行 `npm.cmd run static`、相关测试和 `npm.cmd run simulate`。

测试失败时保留真实失败信息和待处理风险，不用扩大 fixtures 来掩盖契约变化。

## 图片存储与缓存迁移（v0.36.55）

- 图片内容缓存 `igs-image-cache` v3 将可再生的像素内容与路径别名分开；素材、CG 与照片的业务记录仍保留各自的权威 schema，不能用缓存未命中推断原图已删除。
- 媒体提交日志 `igs-media-journal` v1 和备份 v2 承载写入与删除恢复；设置文件 v2 的引用、地图记录和文件回收需按 `app/src/media/CONTRACT.md` 与相应存储契约处理旧数据。
- `app/tests/helpers/fake-idb.js`、`fake-media-server.js` 与 `media-fixtures.js` 模拟事务、存储配额和文件接口；`media-cache-*`、`media-storage-lifecycle`、`media-transactions`、`media-settings-concurrency` 覆盖缓存生命周期、失败补偿和兼容路径。模拟结果不等于真实酒馆或手机存量数据验收。
