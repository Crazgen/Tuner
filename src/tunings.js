/**
 * Guitar tuning library.
 * String MIDI numbers: low E → high e (6 strings), standard order.
 * MIDI 40 = E2, 45 = A2, 50 = D3, 55 = G3, 59 = B3, 64 = E4
 */

export const STRINGS = [
  { index: 1, label: '6', thinName: 'E', gauge: '低音 E' },
  { index: 2, label: '5', thinName: 'A', gauge: 'A' },
  { index: 3, label: '4', thinName: 'D', gauge: 'D' },
  { index: 4, label: '3', thinName: 'G', gauge: 'G' },
  { index: 5, label: '2', thinName: 'B', gauge: 'B' },
  { index: 6, label: '1', thinName: 'e', gauge: '高音 E' },
];

/**
 * Tuning modes.
 * Each entry: name, midi notes [low E … high e], description.
 */
export const TUNINGS = [
  {
    id: 'standard',
    name: '标准调弦',
    short: 'EADGBE',
    description: '最常用的吉他调弦',
    midi: [40, 45, 50, 55, 59, 64],
  },
  {
    id: 'half-down',
    name: '降半音',
    short: 'Eb Ab Db Gb Bb Eb',
    description: '全部降低半音，适合摇滚/流行',
    midi: [39, 44, 49, 54, 58, 63],
  },
  {
    id: 'whole-down',
    name: '降全音',
    short: 'D G C F A D',
    description: '全部降低全音，音色更低沉',
    midi: [38, 43, 48, 53, 57, 62],
  },
  {
    id: 'drop-d',
    name: 'Drop D',
    short: 'DADGBE',
    description: '仅 6 弦降到 D，摇滚/金属常用',
    midi: [38, 45, 50, 55, 59, 64],
  },
  {
    id: 'drop-c',
    name: 'Drop C',
    short: 'CGCFAD',
    description: 'Drop D 再整体降全音，重型音乐',
    midi: [36, 43, 48, 53, 57, 62],
  },
  {
    id: 'open-g',
    name: 'Open G',
    short: 'DGDGBD',
    description: '开放 G 大调，布鲁斯滑棒',
    midi: [38, 43, 50, 55, 59, 62],
  },
  {
    id: 'open-d',
    name: 'Open D',
    short: 'DADF#AD',
    description: '开放 D 大调，指弹/滑棒',
    midi: [38, 45, 50, 54, 57, 62],
  },
  {
    id: 'open-e',
    name: 'Open E',
    short: 'EBEG#BE',
    description: '开放 E 大调',
    midi: [40, 47, 52, 56, 59, 64],
  },
  {
    id: 'dadgad',
    name: 'DADGAD',
    short: 'DADGAD',
    description: '凯尔特/指弹常用开放调弦',
    midi: [38, 45, 50, 55, 57, 62],
  },
  {
    id: 'open-a',
    name: 'Open A',
    short: 'EAEAC#E',
    description: '开放 A 大调',
    midi: [40, 45, 52, 57, 61, 64],
  },
];

export function getTuning(id) {
  return TUNINGS.find((t) => t.id === id) || TUNINGS[0];
}

export function getTuningById(id) {
  return getTuning(id);
}

/**
 * For a given tuning, return per-string targets:
 * [{ stringIndex, label, midi, name, octave, frequency }]
 */
export function stringTargets(tuning) {
  return tuning.midi.map((midi, i) => {
    const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
    const name = names[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    return {
      stringIndex: i + 1,
      label: STRINGS[i].label,
      thinName: STRINGS[i].thinName,
      midi,
      name,
      octave,
      frequency,
      displayName: `${name}${octave}`,
    };
  });
}
