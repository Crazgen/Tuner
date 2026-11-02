# Guitar Tuner

PC guitar tuner: real-time microphone pitch detection, arc-scale deviation display, with standard and common alternate tunings.

[English](README.md) | [简体中文](README.zh-CN.md)

## Install

Download from [Releases](../../releases):

| File | Description |
|------|-------------|
| `Guitar-Tuner-Setup-x.x.x.exe` | Installer; launch from Start menu after install |
| `Guitar-Tuner-Portable-x.x.x.exe` | Portable (no install); run directly |

Requires Windows 10/11 x64. Allow microphone access on first launch.

## Features

- Pick a string, or pluck and the app follows the nearest target
- Arc needle: flat / in tune / sharp, plus cent offset
- Tunings: Standard (EADGBE), Half-step down, Whole-step down, Drop D, Drop C, Open G/D/E/A, DADGAD, and more

## Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Toggle microphone |
| `1`–`6` | Select string (6 = low E) |

## Run from source (development)

Requires Node.js.

```bash
npm install
npm start
```

On Windows you can also double-click `start-tuner.bat` in the project folder.

Build Windows installer / portable exe:

```bash
npm run dist
```

Artifacts are written to `dist/` (see `dist/README.md`).

## License

Copyright (c) 2026 Crazgen

Released under the [MIT License](LICENSE).

## Acknowledgments

- [Electron](https://www.electronjs.org/) — cross-platform desktop shell (MIT)
- YIN pitch detection: de Cheveigné, A., & Kawahara, H. (2002). *YIN, a fundamental frequency estimator for speech and music*. JASA.
