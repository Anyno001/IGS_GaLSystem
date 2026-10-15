# generated-images 模块契约

## 显示就绪通知（test-v0.36.65）

- 原图和缩略图读回后，只有对应中央缓存键存在可显示地址才发 `image-loaded`。缓存预算未接纳图片不属于文件丢失，不写永久失败状态，也不发通知推动下一轮静态页重绘；后续正常使用仍可重新读取。

## CG 锚句作用域（v0.36.63）

- 有真实 `<content>` 时，锚句只在各段正文中按精确 → 规范化 → 最长公共子串定位；后段精确命中优先于前段模糊命中。无正文容器时保留原全文查找路径。
- 锚句命中与安全插入分开判断。命中后无法越过完整结构时明确报告「已命中正文，但无法安全插入」，不再误报正文未匹配；两类失败同时出现时分别计数。只有安全标记写回成功后才调用出图。

## 正文补图恢复（v0.36.61）

- 工具栏「绘制CG」只操作楼层 CG；「补全立绘与背景」操作聊天素材，成功后发既有素材更新事件，进入「素材 → 待确认」，不自动替用户正式入库。手动补全不受自动背景/立绘开关限制，不修改这些设置。
- 差分失败记录不能作为永久已完成状态：本楼自动重绘不重复发送，手动补全或下一楼新的相同需求可重试。原图缺词时进入既有背景规划队列，保留 `variantOf`；只有确认原图已是目标时段才写 `skipped` + `skipReason: 'same-time'`。旧无原因 skipped 重新检查，用户 discarded 继续跳过。
- 缩略图能使用同一中央缓存内已经就绪的原图，文件暂时不可读不能挡住刚生成的像素；不维护第二份图片缓存。
- 数据库生图空 Blob/空 data URL 返回失败并保留提示词。CG 成功计数、槽位状态与重试判断共用非空图判断；旧 done 但没有图的槽可重新出图。重试复用已有提示词，日志明确说明，不重复规划或改动标记位置。

## 素材读取恢复（v0.36.59）

- 不把一次读空永久加入缺图集合；显示使用短期失败状态，网络失败与真实缺图分开。后续正常读取、网络 online 事件、原图读取成功和图片身份变更均可恢复，不依赖打开设置器或清缓存。
- 缩略图路径重新读到了原图时清除旧失败状态；已有原图缓存也优先于失败记录。失败、成功和恢复仍用既有素材更新事件通知阅读器。停止后解除 online 订阅，过期任务不得写失败状态或发完成通知。

## 副 LLM 请求通道（v0.36.58）

- CG、素材、物品及其它调用共用 host 的副 LLM 服务；独立 OpenAI 兼容接口经酒馆后端转发模型列表与生成。调用方继续使用原有配置、模型名单和文本结果，不各自实现跨域请求或改写主模型配置。

## 素材冷启动（v0.36.57）

- 素材服务用同一个 `ready` Promise 完成元数据恢复，显示和缩略图先取得原始记录，再建立像素缓存任务；记录恢复失败时继续使用文件适配器的本机读取后备，不能因等待恢复阻断已保存的本机图。
- 素材模式启用时启动一次记录恢复，成功发 `records-ready` 通知；原图仍按需读取，不批量预载图库或调用 provider。清理或停止后的旧读取不得发图片完成通知或回填像素。

## 跨行对白 CG 锚定（v0.36.55）

- 插图规划的段落编号与标记移植上下文使用 `scene/directive-tags.js` 的完整逻辑行，闭合的跨行对白 / 心理话只算一个段落；保留原始行号供 `imageMarkerBoundary` 向结构闭合处推移。
- 锚句命中跨行对白内部时，锚句和段落编号两条路径都在整个对白闭括号之后独占行插入。移植不得用独立 `]` 当上下文，已有槽号、原文及图片绑定保持。

## 生图点结构边界（v0.36.51）

- 精确、规范化及最长公共子串锚定均经过 `scene/image-marker-layout.js` 计算安全落点；编号段落和正文变动后的标记重定位共用相同入口。
- 标记放在完整结构和整行段落结束后，独占一行，不拆对白、心理话、其他括号指令、HTML 或代码块；`<content>` 内的点不能挪到容器外。未闭合结构没有安全落点时跳过，不强行把标记写入半截标签。
- 同一结构内的多个锚点保留原锚句顺序、槽号及图片绑定。旧标记重新规划前先规范布局，再剥离标记；模型规划、图片生成与来源插件接口保持原样。

## 职责

- 管理生图 provider。
- 内置 provider 放在 `generated-images/providers/`。
- 模型专属请求构建器放在 `generated-images/request-builders/`。
- st-chatu8 必须作为可拆卸内置 provider，而不是写死在核心逻辑里。
- 兼容 Immersive Galgame System 既有的外部插图扩展适配能力。
- 支持内置生图 API、提示词预设、轮询和失败反馈。
- 生成图持久化和图片池统一交给 `media`。
- 检测到生图段时驱动 `visual` 切换到生图层；生图段消失时回到背景+立绘。
- 自动插图由 `illustration/` 负责段落编号、标记插入、规划提示词与解析、设置规范化和事件驱动服务；tag 与图片交由 `media/illustration-store.js` 保存。
- NovelAI 官方接口由 `request-builders/nai-v4-builder.js`（`providerType: nai-official`）构建请求、`nai-official-client.js` 发起请求，并复用 `image-api-client.js` 的响应解析；不得覆盖既有 `bridge.imageApi`。

- 生图提示词公共规则在 `illustration/prompt-kit.js`：虚构/成年人框架、CG 构图指南、拒答识别与「温和模式」重试（主提示词被拦截时只让 LLM 写构图，露骨 tag 由本地模板 `nsfwExtra` 补）、内置背景/立绘 NAI 模板与背景词典兜底。
- 生图排查日志（`image-job-log.js`）：自动插图与素材补全通过 `report(level, message)` 上报进度与失败原因，由 bootstrap 写入日志（localStorage `igs_image_job_log`，按 `bridge.imageJobLog.retainDays` / `maxEntries` 自动清理）并按 `bridge.showToasts` 弹 toast；只有 `done` 楼层算已处理，失败 / 过期楼层下次渲染重试。副 LLM 系统提示词可由 `bridge.autoIllustration.llm.prompts.*` 覆盖，留空用内置。
- 正文字数门槛（`illustration/floor-body-length.js`）：自动插图与素材补全自动触发时，先按 `bridge.sourceFilter`（和阅读器同一套正文保留 / 排除标签，`scene/message-source.js` 的 `readerBodyText`）取出正文；台词 / 心理只数台词本身，指令和空白不算。不足 `MIN_AUTO_IMAGE_BODY_CHARS`（50）字返回 `body-too-short`，日志写一行原因，不记成已处理（楼层「继续」写长后下次渲染照常处理）；手动生成不受限。
- 素材补全（`illustration/asset-generation-service.js`）：场景素材模式开启且对应开关打开时，最新 AI 楼层出现素材库匹配不上的场景或无名角色 → 副 LLM 写内容 tag（`asset-prompt.js`）→ NAI 生成（立绘 V5 走原生透明底，其余模型浅灰底 + `media/alpha-matte.js` 抠图）→ 存为本聊天临时素材，状态 `review`，等待楼层结束时由阅读器询问用户加入素材库 / 仅本聊天 / 丢弃。
- 物品图（`illustration/item-image-service.js`，设置 `bridge.itemImages`，默认关闭）：关闭时入口短路，不读表、不联网。候选 = 本楼 `[igs-fx:item]` 标签物品在前 + 物品表（`data/shujuku/item-catalog.js`）在后，按归一化名称合并；缺图者每层最多 `maxPerFloor`（默认 3）件，串行队列 + 按物品键在途锁，重复事件不重复计费。存入 `igs-generated-assets`，`type: 'item'`、状态 `ready`（不进入素材审核与临时素材列表），按聊天隔离；重画失败保留原图，`discarded` 不自动重补。手动「补全物品图」单次最多 10 件。提示词见 `illustration/item-prompt.js`（副 LLM 失败时仅纯英文名兜底，中文名记失败待重试）；透明底沿用立绘分支。

- 角色 DNA（`scene/character-dna.js`）进入提示词链：立绘补全按 `triggerWords → identity → defaultAppearance → 副 LLM tag → 模板` 合并，负向插在模板负面词之后；CG 只合并 `triggerWords → identity` 与 DNA `negative`，`defaultAppearance` 只交给 planner 作默认资料。planner 输出 `char: 角色名 | x,y | tags`，旧格式 `char: x,y | tags` 仍可解析；无名角色只在「本张单人且上下文唯一角色」时绑定，否则不注入并上报 warning。数据库生图模式下素材经既有 `meta.userPrompts` 传递合并结果；剧情 CG 使用插件返回的 caption 原样出图，不把 DNA 拼进 char caption。智绘姬链路不变。
- 素材服务新增 `getEditableImage(imageId)` 与 `saveMatteEdit(imageId, expectedRevision, patch)`，按 revision 原子更新并发出 `matte-edited` 事件。
- 局部重绘能力协商：`image-backend.js` 的 `describeEdit()` / `edit()` 与普通 `generate` 分离；只有内置 NAI、客户端提供 `edit` 且所选模型存在 inpainting 版本（`request-builders/nai-inpaint-builder.js`，action `infill`）时才支持，否则返回 `image-edit-unsupported`，禁止退化为整张重画。请求形状仅经 fixture 验证，真实接口兼容性需真机确认。
- AI 修复事务（`illustration/inpaint-transaction.js`）：必须用户显式触发；预览只在内存，接受时校验 revision → 写 `workingDataUrl` → 重新自动抠图 → 原子更新；取消 / 失败 / 过期不写任何资产字段；「恢复原图」清除 `workingDataUrl` 并从原图重抠。AI 结果是生成式重建，不代表恢复原始像素。错误与日志不得包含 API Key、原图 base64 或完整请求体。
- 智绘姬出图（`chatu8-client.js`）：图像来源为 `extension` 时，剧情 CG、素材与物品图经酒馆全局 `eventSource` 的 `generate-image-request` / `generate-image-response` 事件（按 `id` 配对）交给智绘姬出图，只发送合并后的场景与角色 tag，画师串、质量词与尺寸沿用智绘姬自身设置；智绘姬按其挂在主窗口的设置函数判定已安装。未检测到智绘姬、出图失败、超时或返回视频时，填了 NAI Key 就退回内置 NAI，否则按失败上报。走智绘姬时立绘一律按非透明底出图并抠图。阅读器重画仍代点楼层内智绘姬按钮。事件协议来自上游打包源码而非公开 API，上游改名即失效，需真机确认。
- 智绘姬读取层按上游原版 DOM（`dom-image-candidates.js`）：图片取 `.st-chatu8-image-container` / `.st-chatu8-image-span` / `span[data-request-id]` 内的 `img` 与 `video`，按钮取 `.image-tag-button` / `.st-chatu8-image-button`（均带 `data-request-id`）；图片与重画按钮优先按 `data-request-id` 精确配对，slotIndex / locationHash / imageId / buttonIndex 与 DOM 顺序兜底不变。原 `img.st-chatu8-image-tag-image` 选择器在上游已不存在，不得恢复。

- 柏宝绘出图（`baibai-client.js`）：图像来源为 `baibai` 时，剧情 CG、素材、物品图与阅读器重画经柏宝绘公开接口 `globalThis.STBaiBaiImage`（apiVersion 1）出图，`save: false` 不进柏宝绘图库；后端支持多角色时分角色传，否则拼成一段 prompt；未检测到或失败时有 NAI Key 就退回内置 NAI。不保证透明底，立绘按浅灰底出图再抠图。
- 副 LLM 写词（`illustration/caption-writer.js`）：图像来源不是数据库生图时，`writeDbgenPrompt` 改由副 LLM 按同一份描述写 NAI v4 caption，`generateDbgenCaption` 把 caption 拆回 slot 按当前来源出图；表情差分、头像、默认立绘与衣柜共用。副 LLM 选独立 API 却没填地址或模型时直接报「还没接副 LLM」，不发请求。副 LLM 设置单独在「生图 → 副 LLM」子页。

## Provider 契约

- `detect(context)`
- `generate(request)`
- `poll(task)`
- `extractImages(messageContext)`

## Request Builder 契约

- `providerType`
- `schemaVersion`
- `buildRequest(promptContext, promptPreset, providerPreset)`
- `validateRequest(request)`

Provider 负责发请求和解析返回；Request Builder 负责把通用场景变量、提示词预设和 provider 配置转成模型专属请求。NAI、ComfyUI、GPT 图像、banana 等模型必须各自拥有独立 builder。

## 导入位置

只在生图插件页导入、导出和管理 provider，不设置全局 Mod 管理页。

## 禁止

- 禁止把本地文件缓存逻辑写进 provider。
- 禁止 provider 直接操作视觉 DOM。
- 禁止把模型专属提示词框架写死进通用 `prompts`。
- 禁止默认联网，必须由用户启用 provider 后才发起请求。
- 禁止在 provider 禁用后继续扫描对应 DOM。

## 媒体交接（v0.36.39）

- 生成服务共用装配层注入的 `mediaCache`。素材、CG、物品只保存身份/元数据和有界任务状态，原图、缩略图、Blob URL 不得另存业务缓存。
- `getImagePrompt/saveImagePrompt` 等元数据操作不 hydrate 图片；修图/导出显式读取原图和遮罩，读取不完整则失败。revision 冲突保留当前图并补偿上传。
- 临时素材保存引用失败须补偿新图片；成功替换后释放旧图片。CG 单张/整楼重画在成功提交前保留旧记录；读取只加载当前槽位，不因显示一张读完整楼 16 张。
- 停止、销毁和清缓存后不接受旧任务像素或更新事件。外部插件图片保持外部所有权，显示预热复用浏览器 HTTP 缓存，不复制为另一份 Blob 磁盘缓存。

v0.36.44：当前聊天临时素材/物品元数据共用媒体层 `asset-record-cache.js`，记录与仅含键的分页索引共享中央注册表中的所有者预算。同步展示 miss 按需补载，生图前的缺失确认、入库/丢弃/重画必须 fresh 查询完整权威记录；缓存容量只能影响驻留，不能停止补图或把淘汰当缺失。查询失败保留已有引用并暂停该次操作，待确认页的重新读取可恢复当前聊天的暂停补图；手动物品补全可再次点击。聊天切换、清理、销毁以及查询期间的新写入使旧结果失效。CG 状态及缺图 TTL 仍由注册表管理。消息关联保存资源键，读取时解析当前显示 URL，失效则重新向消息/provider 取图。bootstrap 不手动逐个调用服务清缓存。
