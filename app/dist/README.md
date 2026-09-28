# dist

本目录保存可由 `loader/` 远程加载的正式构建产物，不直接手工编辑。

## 内容

- `igs.bundle.js`：自包含 ES module bundle。
- `igs.bundle.css`：运行时样式和字体入口。
- `manifest.json`：与 `app/package.json` 同步的版本信息。
- `fonts/`、`maps/`：构建时复制的运行时素材及其许可证文件。

在 `app/` 目录运行 `npm.cmd run build` 更新本目录；发布前必须运行完整 `npm.cmd run gate`。
