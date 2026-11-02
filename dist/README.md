# dist / — 打包输出目录

本目录及子目录只存放**打包与 Release 相关产物**，全部被 `.gitignore` 忽略。

| 内容 | 说明 |
|------|------|
| `Guitar-Tuner-Setup-*.exe` | NSIS 安装包（`npm run dist` 生成） |
| `Guitar-Tuner-Portable-*.exe` | 便携版 |
| `win-unpacked/` | 解包中间产物 |
| `builder-effective-config.yaml` | 本次打包生效配置 |
| `temp/` | 构建临时文件 |
| `build-resources/` | 图标等打包资源（可选） |

## 生成安装包

在**项目根目录**（不是本目录）执行：

```bat
npm run dist
```

输出结果在本文件夹内。请先在本机安装并启动，确认麦克风可用后，再把 exe 挂到 GitHub Release。
