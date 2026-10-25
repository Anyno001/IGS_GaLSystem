# schemas 契约

`app/src/schemas/` 存放跨模块共享的机器可读数据结构。它解决“多个模块都要理解同一种对象”的问题，不承载业务实现。

角色 DNA 的清空状态与旧身份判定由 scene 的 `character-dna` 统一提供；新候选校验同时保护已有主体和单独填写的非空负面词。`clearedViews` 仅记录用户明确清空的景别，不把负面词占位当成清空操作。

## 允许放入

- SceneState、ScenePatch、CharacterMatch、BackgroundMatch 等跨 `scene` 与 `visual` 的结构。
- ModManifest、PresetManifest、PackManifest、ImportResult 等跨 `registry`、`mods`、`presets`、`media` 的结构。
- PublicApiResult、PermissionDeclaration、ActionDescriptor 等跨 `api`、`actions`、`mods` 的结构。
- ReaderMode 等被 API、存储和 visual 共同消费的稳定枚举与纯归一化函数。
- 可导入文件格式的 JSON Schema。
- 运行时校验器的薄封装，但必须无副作用。

## 不允许放入

- provider 请求构建逻辑。
- DOM 渲染、样式 token 或 UI 组件。
- shujuku 具体写表实现。
- 大段 prompt、真实聊天正文、真实 API key。
- 只被单个模块使用的私有类型。

## 与其他 schema 目录的关系

- `character-meta.js`、`outfit-template.js`、`prompt-recipe.js` 为角色绑定、景别/衣装模板与生成快照提供跨层纯校验。编号、角色键、位置、占位符和输出协议必须可唯一绑定；失败返回受控字段与原因，不夹带原图、身份正文或密钥。
- version 2 DNA 的三景别完整性与旧 DNA 兼容由 scene 负责，schema 不把旧自由文本猜测成新模板；新字段导入不得绕过现有危险键检查。
- `app/src/prompts/schemas/` 只放模型提示词、图像工作流和 provider 参数 schema。
- `app/src/data/shujuku/` 可以保留 shujuku 私有表格结构。
- 当结构被三个以上模块共享，或需要作为导入文件格式公开时，迁入本目录。

## 命名建议

```text
scene-state.schema.json
import-manifest.schema.json
mod-permission.schema.json
resource-pack.schema.json
public-api-result.schema.json
```

每个新增 schema 应同步补充短 fixtures 和 `docs/SCHEMA_AND_FIXTURES.md` 中的测试覆盖说明。
