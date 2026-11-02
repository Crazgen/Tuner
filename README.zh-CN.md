# Guitar Tuner

PC 吉他调音器：麦克风实时音高检测，弧形刻度显示偏差，支持标准调弦与多种流行调弦模式。

[English](README.md) | [简体中文](README.zh-CN.md)

## 安装

到本仓库 [Releases](../../releases) 下载：

| 文件 | 说明 |
|------|------|
| `Guitar-Tuner-Setup-x.x.x.exe` | 安装版，安装后从开始菜单启动 |
| `Guitar-Tuner-Portable-x.x.x.exe` | 便携版（绿色免安装），直接运行 |

系统要求：Windows 10/11 x64。首次启动时允许麦克风权限。

## 功能

- 选择琴弦或拨弦后自动贴近目标弦
- 弧形刻度指针：偏低 / 音准 / 偏高，以及音分偏差
- 调弦模式：标准 (EADGBE)、降半音、降全音、Drop D、Drop C、Open G/D/E/A、DADGAD 等

## 快捷键

| 键 | 作用 |
|----|------|
| `空格` | 开关麦克风 |
| `1`–`6` | 选择琴弦（6 为低音 E） |

## 从源码运行（开发）

环境：Node.js。

```bash
npm install
npm start
```

Windows 也可在项目目录双击 `start-tuner.bat`。

打包 Windows 安装包 / 便携版：

```bash
npm run dist
```

产物在 `dist/` 目录（详见 `dist/README.md`）。

## 版权与许可

Copyright (c) 2026 Crazgen

本项目采用 [MIT License](LICENSE) 开源发布。

## 鸣谢

- [Electron](https://www.electronjs.org/) — 跨平台桌面壳（MIT）
- YIN 音高检测算法：de Cheveigné, A., & Kawahara, H. (2002). *YIN, a fundamental frequency estimator for speech and music*. JASA.
