import {
  detectPitchYIN,
  frequencyToNote,
  PitchSmoother,
} from './pitch.js';
import {
  TUNINGS,
  getTuning,
  stringTargets,
} from './tunings.js';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
const state = {
  running: false,
  tuningId: 'standard',
  selectedString: 1, // 1-based, low E = 1
  audioContext: null,
  analyser: null,
  source: null,
  stream: null,
  smoother: new PitchSmoother({ windowSize: 5 }),
  lastCents: 0,
  lastFreq: 0,
  hasSignal: false,
  rafId: 0,
  buffer: null,
};

// ─────────────────────────────────────────────
// DOM
// ─────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

const el = {
  micBtn: $('mic-btn'),
  micLabel: $('mic-label'),
  micIcon: $('mic-icon'),
  tuningMode: $('tuning-mode'),
  statusRibbon: $('status-ribbon'),
  statusText: $('status-text'),
  gauge: $('gauge'),
  track: $('track'),
  activeArc: $('active-arc'),
  ticks: $('ticks'),
  needle: $('needle'),
  lockRing: $('lock-ring'),
  noteName: $('note-name'),
  noteOctave: $('note-octave'),
  freqReadout: $('freq-readout'),
  centsReadout: $('cents-readout'),
  direction: $('direction'),
  directionArrow: $('direction-arrow'),
  directionText: $('direction-text'),
  gaugeWrap: document.querySelector('.gauge-wrap'),
  stringList: $('string-list'),
  tuningDesc: $('tuning-desc'),
};

// ─────────────────────────────────────────────
// Gauge geometry
// ─────────────────────────────────────────────
// Semicircle arc: center (280, 250), radius 190, from 200° to 340° (left → right)
// Using SVG angles where 0° = east, we draw from 200° to 340° through south.
// Actually easier: draw from 180+20=200° to 360-20=340° in standard math (y-down SVG).
//
// Math (SVG y-down): angle from positive x-axis, clockwise positive.
// We want a top-open semicircle: start 200° (left-ish), end 340° (right-ish),
// center of scale = 270° (straight down from center... wait, we want needle pointing UP)
//
// Needle points UP toward the arc which is ABOVE the hub.
// So the arc is the upper semicircle: from 180° to 0° going through 270°? No.
//
// SVG: 0° = right, 90° = down, 180° = left, 270° = up.
// Upper arc (above center): from 180° (left) through 270° (up) to 0°/360° (right).
// With 20° margin: from 200° ... no that's lower left.
//
// Let's use: startAngle = 200° in "compass from left" is wrong.
// Standard approach for tuner: 180° + margin on left, 0° - margin on right, through 270° (top).
// start = 180 + 18 = 198°  → point at angle 198 (left and slightly down? 180=left, 198 is left-down)
// For upper semicircle we want angles between 180 and 360 going through 270.
// start = 180 + 15 = 195 (slightly below left) ... hmm still slightly below.
//
// Correct: angle θ measured from positive x-axis, counterclockwise is negative in SVG
// because y is flipped. Easier to use polar helper with degrees where
// 270° is top, 180° left, 0°/360° right, 90° bottom.
// Upper semicircle: θ from 195° to 345° would be LOWER (through 270 which is top... wait)
// 180 = left, 270 = top, 360 = right. Yes! 195→345 goes 195(left-down?) no:
// 180 left, 195 is 15° past left toward bottom (90 is bottom... 180→270 is left→top).
// So 180→270→360 is left→top→right. YES upper semicircle.
// start = 195 (15° past left toward top? 180→270 is left to top, so 195 is 15° toward top from left).
// end = 345 (15° before right from top side). Perfect.

const CX = 280;
const CY = 250;
const RADIUS = 190;
const START_DEG = 195; // left
const END_DEG = 345;   // right
const SPAN_DEG = END_DEG - START_DEG; // 150°
const CENTER_DEG = START_DEG + SPAN_DEG / 2; // 270 = top

// Needle rests at CENTER_DEG and rotates by (cents / 50) * (SPAN_DEG / 2)
const CENTS_MAX = 50;
const NEEDLE_LENGTH = 168;

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  // sweep-flag 1 = clockwise in SVG (which matches increasing degree with y-down)
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function drawGauge() {
  // Track (full arc)
  el.track.setAttribute('d', describeArc(CX, CY, RADIUS, START_DEG, END_DEG));

  // Colored gradient arc (slightly thinner, inside)
  el.activeArc.setAttribute('d', describeArc(CX, CY, RADIUS, START_DEG, END_DEG));

  // Ticks: 20 steps of 5 cents → majors land exactly on -50/-25/0/+25/+50
  const intervals = 20;
  let html = '';
  for (let i = 0; i <= intervals; i++) {
    const t = i / intervals;
    const deg = START_DEG + t * SPAN_DEG;
    const cents = Math.round(-CENTS_MAX + t * CENTS_MAX * 2);
    const isCenter = cents === 0;
    const isMajor = cents % 25 === 0;

    const outer = polar(CX, CY, RADIUS - 22, deg);
    const inner = polar(CX, CY, RADIUS - (isMajor ? 42 : 32), deg);

    html += `<line class="tick ${isMajor ? 'is-major' : ''} ${isCenter ? 'is-center' : ''}"
      x1="${outer.x.toFixed(1)}" y1="${outer.y.toFixed(1)}"
      x2="${inner.x.toFixed(1)}" y2="${inner.y.toFixed(1)}" />`;

    if (isMajor) {
      // Outside the arc so labels never collide with the big note name
      const labelPos = polar(CX, CY, RADIUS + 18, deg);
      const label = isCenter ? '0' : (cents > 0 ? `+${cents}` : `${cents}`);
      html += `<text class="tick-label" x="${labelPos.x.toFixed(1)}" y="${labelPos.y.toFixed(1)}">${label}</text>`;
    }
  }
  el.ticks.innerHTML = html;

  // Needle: ONE triangle from fixed hub (CX,CY) to the tick arc.
  // Only SVG rotate(deg, CX, CY) — no CSS transform-origin.
  const tip = polar(CX, CY, NEEDLE_LENGTH, CENTER_DEG);
  const baseL = { x: CX - 7, y: CY };
  const baseR = { x: CX + 7, y: CY };

  let tipPoly = el.needle.querySelector('#needle-tip');
  if (!tipPoly) {
    tipPoly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    tipPoly.setAttribute('id', 'needle-tip');
    el.needle.appendChild(tipPoly);
  }
  tipPoly.setAttribute('points', [
    Number(tip.x).toFixed(1), Number(tip.y).toFixed(1),
    Number(baseR.x).toFixed(1), Number(baseR.y).toFixed(1),
    Number(baseL.x).toFixed(1), Number(baseL.y).toFixed(1),
  ].join(' '));

  const line = el.needle.querySelector('#needle-line');
  if (line) {
    line.setAttribute('x1', String(CX));
    line.setAttribute('y1', String(CY));
    line.setAttribute('x2', Number(tip.x).toFixed(1));
    line.setAttribute('y2', Number(tip.y).toFixed(1));
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.85');
  }
}

function setNeedle(cents) {
  const clamped = Math.max(-CENTS_MAX, Math.min(CENTS_MAX, cents));
  // 0 -> top (0 mark); +50 -> right end of arc; -50 -> left end
  const rotation = (clamped / CENTS_MAX) * (SPAN_DEG / 2);
  el.needle.setAttribute('transform', `rotate(${rotation.toFixed(2)} ${CX} ${CY})`);
}

function populateTuningSelect() {
  el.tuningMode.innerHTML = TUNINGS.map(
    (t) => `<option value="${t.id}">${t.name} · ${t.short}</option>`
  ).join('');
  el.tuningMode.value = state.tuningId;
}

function renderStrings() {
  const tuning = getTuning(state.tuningId);
  const targets = stringTargets(tuning);
  el.tuningDesc.textContent = `${tuning.name} · ${tuning.short} — ${tuning.description}`;

  el.stringList.innerHTML = targets
    .map((t) => {
      const selected = t.stringIndex === state.selectedString ? 'is-selected' : '';
      return `
        <div class="string-item ${selected}" data-string="${t.stringIndex}" role="option"
             aria-selected="${t.stringIndex === state.selectedString}">
          <div class="string-num">${t.label}</div>
          <div class="string-info">
            <div class="string-note">${t.displayName}</div>
            <div class="string-freq">${t.frequency.toFixed(2)} Hz</div>
          </div>
          <div class="string-target">目标</div>
        </div>`;
    })
    .join('');

  // Wire clicks
  el.stringList.querySelectorAll('.string-item').forEach((node) => {
    node.addEventListener('click', () => {
      state.selectedString = Number(node.dataset.string);
      renderStrings();
      // Soft reset of display toward the new target
      updateTargetHighlight(null);
    });
  });
}

function updateTargetHighlight(detectedMidi) {
  const tuning = getTuning(state.tuningId);
  const targets = stringTargets(tuning);
  el.stringList.querySelectorAll('.string-item').forEach((node) => {
    const idx = Number(node.dataset.string);
    node.classList.remove('is-matched');
    if (detectedMidi != null) {
      const t = targets[idx - 1];
      if (t && t.midi === detectedMidi) {
        node.classList.add('is-matched');
      }
    }
    node.classList.toggle('is-selected', idx === state.selectedString);
  });
}

// ─────────────────────────────────────────────
// Direction / status UI
// ─────────────────────────────────────────────
function setStatus(kind, text) {
  el.statusRibbon.className = `status-ribbon is-${kind}`;
  el.statusText.textContent = text;
}

function setDirection(mode) {
  el.direction.className = 'direction';
  if (mode === 'up') {
    el.direction.classList.add('is-up');
    el.directionArrow.textContent = '↑';
    el.directionText.textContent = '调高 · 偏低';
  } else if (mode === 'down') {
    el.direction.classList.add('is-down');
    el.directionArrow.textContent = '↓';
    el.directionText.textContent = '调低 · 偏高';
  } else if (mode === 'good') {
    el.direction.classList.add('is-good');
    el.directionArrow.textContent = '✓';
    el.directionText.textContent = '音准完美';
  } else {
    el.directionArrow.textContent = '·';
    el.directionText.textContent = state.running ? '等待拨弦' : '待机';
  }
}

function clearDisplay() {
  el.noteName.textContent = '—';
  el.noteOctave.textContent = '';
  el.freqReadout.textContent = '0.0 Hz';
  el.centsReadout.textContent = '0 ¢';
  setNeedle(0);
  setDirection(null);
  el.gaugeWrap.classList.remove('is-in-tune', 'is-flat', 'is-sharp');
  updateTargetHighlight(null);
}

// ─────────────────────────────────────────────
// Audio pipeline
// ─────────────────────────────────────────────
async function startMic() {
  try {
    setStatus('idle', '正在请求麦克风权限…');

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
      video: false,
    });

    const audioContext = new AudioContext({ sampleRate: 44100 });
    // Some browsers report 48000 regardless; that's fine.
    await audioContext.resume();

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.0;
    source.connect(analyser);

    state.stream = stream;
    state.audioContext = audioContext;
    state.source = source;
    state.analyser = analyser;
    state.buffer = new Float32Array(analyser.fftSize);
    state.running = true;
    state.smoother.reset();

    el.micBtn.classList.add('is-active');
    el.micLabel.textContent = '关闭麦克风';
    el.micIcon.textContent = '⏹';
    setStatus('live', '麦克风已开启 · 请拨动琴弦');

    // Seed strings UI
    renderStrings();
    setDirection(null);

    // Start analysis loop
    cancelAnimationFrame(state.rafId);
    tick();
  } catch (err) {
    console.error(err);
    setStatus('error', `无法访问麦克风：${err.message || err.name || '未知错误'}`);
    stopMic();
  }
}

function stopMic() {
  cancelAnimationFrame(state.rafId);
  state.rafId = 0;
  state.running = false;

  try {
    state.source?.disconnect();
    state.stream?.getTracks().forEach((t) => t.stop());
    state.audioContext?.close();
  } catch {
    /* ignore teardown races */
  }

  state.stream = null;
  state.audioContext = null;
  state.source = null;
  state.analyser = null;
  state.smoother.reset();

  el.micBtn.classList.remove('is-active');
  el.micLabel.textContent = '开启麦克风';
  el.micIcon.textContent = '🎤';
  setStatus('idle', '麦克风已关闭 · 点击「开启麦克风」重新开始');
  clearDisplay();
}

function tick() {
  if (!state.running || !state.analyser) return;

  state.analyser.getFloatTimeDomainData(state.buffer);
  const sampleRate = state.audioContext.sampleRate;
  const freq = detectPitchYIN(state.buffer, sampleRate, {
    threshold: 0.12,
    probabilityThreshold: 0.82,
    minFreq: 55,
    maxFreq: 1400,
  });

  const smoothed = state.smoother.push(freq);

  if (smoothed > 0) {
    const note = frequencyToNote(smoothed);
    if (note) {
      state.hasSignal = true;
      state.lastFreq = smoothed;
      state.lastCents = note.cents;

      el.noteName.textContent = note.name;
      el.noteOctave.textContent = String(note.octave);
      el.freqReadout.textContent = `${smoothed.toFixed(1)} Hz`;

      const centsText = `${note.cents > 0 ? '+' : ''}${note.cents} ¢`;
      el.centsReadout.textContent = centsText;

      setNeedle(note.cents);

      // Zone: within ±5 cents = in tune
      const abs = Math.abs(note.cents);
      el.gaugeWrap.classList.remove('is-in-tune', 'is-flat', 'is-sharp');

      if (abs <= 5) {
        el.gaugeWrap.classList.add('is-in-tune');
        setDirection('good');
      } else if (note.cents < 0) {
        // flat → tune up
        el.gaugeWrap.classList.add('is-flat');
        setDirection('up');
      } else {
        // sharp → tune down
        el.gaugeWrap.classList.add('is-sharp');
        setDirection('down');
      }

      // Auto-select nearest string (optional soft assist — keep user's pick if close)
      autoSelectString(note.midi);
      updateTargetHighlight(note.midi);

      if (state.running) {
        setStatus('live', `检测到 ${note.name}${note.octave} · ${smoothed.toFixed(1)} Hz`);
      }
    }
  } else {
    // No pitch this frame — gently idle the UI if we lost the signal for a while
    if (state.hasSignal) {
      // keep last readout briefly; only clear direction if needle is near center noise
      // After smoother fades, show waiting
      if (state.smoother.current() === 0) {
        state.hasSignal = false;
        setDirection(null);
        el.gaugeWrap.classList.remove('is-in-tune', 'is-flat', 'is-sharp');
        // Don't wipe the note name — user still sees last note while re-plucking
      }
    }
  }

  state.rafId = requestAnimationFrame(tick);
}

function autoSelectString(midi) {
  const tuning = getTuning(state.tuningId);
  const targets = stringTargets(tuning);
  let bestIdx = state.selectedString;
  let bestDist = Infinity;

  for (const t of targets) {
    const d = Math.abs(t.midi - midi);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = t.stringIndex;
    }
  }

  // Only auto-switch when clearly closer to a different string (≥ 3 semitones from current)
  const current = targets[state.selectedString - 1];
  const currentDist = current ? Math.abs(current.midi - midi) : 99;
  if (bestIdx !== state.selectedString && bestDist < currentDist && bestDist <= 5) {
    state.selectedString = bestIdx;
    renderStrings();
    updateTargetHighlight(midi);
  }
}

// ─────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────
el.micBtn.addEventListener('click', () => {
  if (state.running) stopMic();
  else startMic();
});

el.tuningMode.addEventListener('change', () => {
  state.tuningId = el.tuningMode.value;
  // Default to string 1 on mode change
  state.selectedString = 1;
  state.smoother.reset();
  renderStrings();
  clearDisplay();
  if (state.running) {
    setStatus('live', `已切换到 ${getTuning(state.tuningId).name} · 请拨动琴弦`);
    setDirection(null);
  }
});

// Keyboard shortcuts: 1-6 select strings, Space toggles mic
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;

  if (e.key >= '1' && e.key <= '6') {
    state.selectedString = Number(e.key);
    renderStrings();
    clearDisplay();
  } else if (e.code === 'Space') {
    e.preventDefault();
    if (state.running) stopMic();
    else startMic();
  }
});

// ─────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────
function init() {
  drawGauge();
  populateTuningSelect();
  renderStrings();
  clearDisplay();
  setStatus('idle', '点击「开启麦克风」开始调音');

  // Respect system reduced-motion
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.setProperty('--anim', '0s');
  }
}

init();
