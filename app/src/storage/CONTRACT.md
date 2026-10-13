# storage 模块契约

## 职责

- 管理配置的 IndexedDB/localStorage 持久化；图片字节、Blob URL、迁移和删除日志归 `media`。
- 持久化本地背景、立绘、头像、预设、Mod 元信息和本地草稿。
- 提供容量统计、删除、迁移和坏数据回滚能力。
- 负责预设注册表快照的读写、归一化和坏数据回退，至少覆盖 `current`、`items`、`drafts` 和 `updatedAt`。

## 存储前缀

- IndexedDB：`vn`
- key 前缀：`vn:*`
- Blob URL 必须可重建，不作为唯一长期来源。
- `preset-store.js` 当前以 localStorage-compatible / memory adapter 固定契约，后续再替换为异步 IndexedDB adapter。
- `tavern-settings-file.js` 把全局配置键镜像到酒馆 `user/files/igs-settings.json`：启动时文件较新则写回本机，本机改动防抖上传；聊天内状态、日志、待审队列不进文件。新增全局配置键要加进它的白名单。

## 禁止

- 禁止把本地文件只存在内存里导致刷新丢失。
- 禁止坏预设覆盖当前启用项。
- 禁止把真实 API Key 明文导出到预设或资源包。

## 图片相关约束（v0.36.39）

- `igs-settings.json` v2 使用 `deletedKeys`；读取网络失败、500、坏 JSON 不得当作 404 上传覆盖。每次上传先读取远程，保留未在本机修改的键和远程删除标记；同源上传串行、请求与响应体均有期限，失败保留待同步状态。
- `igs-map-custom:*` 不再写入或由全局配置同步恢复。地图唯一权威备份是 `igs-map-records.json`；旧设置文件中的地图键由 map repository 在缺少该备份且没有删除标记时一次性迁移。
- 引用存储使用 `checked-storage-write.js` 校验写后读回并在失败时恢复旧值。导入的配置、预设和文件夹保存失败须先恢复旧引用，再回滚暂存图片；不得用原包图片 ID 覆盖本机同名记录。
- 媒体 WAL 与 GC 状态保存在 `igs-media-journal`，它们属于持久数据，不能随清图片缓存删除。参见 media 契约。

v0.36.41：占用说明读取中央缓存的 `backend/persistent/auxiliary`，显示实际启用的跨会话存储与辅助所有者用途、条目数和容量/作用范围。没有 IndexedDB 时显示仅中央内存，不再报告虚构的 192 MiB 本地缓存。64 MiB 指图片编码字节，不能解释为全部浏览器图片内存。

v0.36.43：占用说明同时展示辅助元数据估算与 16 MiB 总预算、每个所有者估算/字节预算、超预算次数和完整载入错误；明确标注估算，不冒充浏览器堆的精确测量。
