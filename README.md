# Guitar Tuner

PC 吉他调音器：麦克风实时音高检测，弧形刻度显示偏差，支持标准调弦与多种流行调弦模式。

## 功能

- 选择琴弦或拨弦后自动贴近目标弦
- 弧形刻度指针：偏低 / 音准 / 偏高，以及音分偏差
- 调弦模式：标准 (EADGBE)、降半音、降全音、Drop D、Drop C、Open G/D/E/A、DADGAD 等

## 运行

环境：Node.js（用于安装 Electron）。

```bash
npm install
npm start
```

Windows 也可在项目目录双击 `start-tuner.bat`。

> 不要直接双击 `node_modules\electron\dist\electron.exe`，那不会加载本项目。

## 快捷键

| 键 | 作用 |
|----|------|
| `空格` | 开关麦克风 |
| `1`–`6` | 选择琴弦（6 为低音 E） |

## 版权与许可

Copyright (c) 2026 Crazgen

本项目采用 [MIT License](LICENSE) 开源发布。

## 鸣谢

- [Electron](https://www.electronjs.org/) — 跨平台桌面壳（MIT）
- YIN 音高检测算法：de Cheveigné, A., & Kawahara, H. (2002). *YIN, a fundamental frequency estimator for speech and music*. JASA.
