// ============================================================
// CONFIGURATION
// ============================================================

const PRESETS = {
  accent: {
    name: 'Accent',
    emoji: '✨',
    brief: 'Warm architectural white',
    colors: ['#ffe8c0'],
    aiEffect: 'Warm white permanent puck lights with a soft premium architectural glow.',
  },
  warmWhite: {
    name: 'Warm White',
    emoji: '🕯️',
    brief: 'Classic warm white',
    colors: ['#fff3d4'],
    aiEffect: 'Clean warm white permanent puck lights with subtle downward wash.',
  },
  coolWhite: {
    name: 'Cool White',
    emoji: '💎',
    brief: 'Bright modern white',
    colors: ['#ddeeff'],
    aiEffect: 'Bright cool-white permanent puck lights with a crisp modern glow.',
  },
  christmas: {
    name: 'Christmas',
    emoji: '🎄',
    brief: 'Red, green & white',
    colors: ['#ff2020', '#15cc40', '#ffffff'],
    aiEffect: 'Festive individual red, green, and white puck lights spaced evenly along the marked runs.',
  },
  fourth: {
    name: '4th of July',
    emoji: '🎆',
    brief: 'Red, white & blue',
    colors: ['#ff1515', '#ffffff', '#1155ff'],
    aiEffect: 'Individual red, white, and blue puck lights spaced evenly only on the marked runs.',
  },
  halloween: {
    name: 'Halloween',
    emoji: '🎃',
    brief: 'Orange & purple',
    colors: ['#ff6600', '#aa00ee'],
    aiEffect: 'Individual orange and purple puck lights with a dramatic but clean seasonal glow.',
  },
  easter: {
    name: 'Easter',
    emoji: '🐣',
    brief: 'Pastel spring colors',
    colors: ['#ff88cc', '#ffee44', '#cc55ff', '#55ee88'],
    aiEffect: 'Soft pastel pink, yellow, lavender, and mint green puck lights for a cheerful spring look.',
  },
  newYear: {
    name: "New Year's",
    emoji: '🥂',
    brief: 'Gold, white & silver',
    colors: ['#ffd700', '#ffffff', '#c0c0c0'],
    aiEffect: 'Elegant gold, white, and silver puck lights for a celebration look.',
  },
};

const PATTERNS = {
  all:     { name: 'All On',      brief: 'Solid run',    pattern: [1] },
  on1off1: { name: '1 On 1 Off',  brief: 'Alternating',  pattern: [1, 0] },
  on1off2: { name: '1 On 2 Off',  brief: 'Sparse',       pattern: [1, 0, 0] },
  on1off3: { name: '1 On 3 Off',  brief: 'Wide gaps',    pattern: [1, 0, 0, 0] },
  on1off4: { name: '1 On 4 Off',  brief: 'Very wide',    pattern: [1, 0, 0, 0, 0] },
  on2off2: { name: '2 On 2 Off',  brief: 'Pairs',        pattern: [1, 1, 0, 0] },
  on3off3: { name: '3 On 3 Off',  brief: 'Clusters',     pattern: [1, 1, 1, 0, 0, 0] },
};

const AI_QUALITY = {
  draft: { name: 'Draft', brief: 'Lower cost', cost: '~$0.03–$0.05', note: 'Favor a cost-efficient draft while still following the marked install path accurately.' },
  final: { name: 'Final', brief: 'Best quality', cost: '~$0.08–$0.15', note: 'Favor the highest quality realistic homeowner-facing render with accurate permanent bulb placement.' },
};

const BULB_SPACING = 16;   // canvas pixels between bulbs
const BULB_RADIUS  = 4.5;  // canvas px radius
const GLOW_RADIUS  = 16;   // canvas px outer glow radius

// ============================================================
// STATE
// ============================================================

const state = {
  photoDataUrl: '',

  isDrawMode: false,
  showLights: true,
  segments: [],   // completed [{x,y}][]
  current:  [],   // in-progress [{x,y}]
  mouseX: null,
  mouseY: null,
  canvasW: 0,
  canvasH: 0,

  preset: 'christmas',
  pattern: 'all',

  // AI gen state
  guidePhotoName: '',
  guidePhotoDataUrl: '',
  aiPreset: 'accent',
  aiQuality: 'final',
  generatedImageDataUrl: '',
  compareSplit: 100,
};

// ============================================================
// DOM REFS
// ============================================================

const refs = {
  photoInput:    document.getElementById('photoInput'),
  photoInput2:   document.getElementById('photoInput2'),
  photoLabelText:document.getElementById('photoLabelText'),
  photoName:     document.getElementById('photoName'),

  emptyState:    document.getElementById('emptyState'),
  canvasArea:    document.getElementById('canvasArea'),
  canvasWrapper: document.getElementById('canvasWrapper'),
  housePhoto:    document.getElementById('housePhoto'),
  canvas:        document.getElementById('drawCanvas'),
  canvasTip:     document.getElementById('canvasTip'),

  drawToggleBtn: document.getElementById('drawToggleBtn'),
  undoBtn:       document.getElementById('undoBtn'),
  clearBtn:      document.getElementById('clearBtn'),
  viewToggleBtn: document.getElementById('viewToggleBtn'),
  modeIndicator: document.getElementById('modeIndicator'),
  previewPreset: document.getElementById('previewPreset'),
  downloadBtn:   document.getElementById('downloadBtn'),
  bulbCount:     document.getElementById('bulbCount'),
  drawHint:      document.getElementById('drawHint'),

  presetButtons: document.getElementById('presetButtons'),
  patternButtons:document.getElementById('patternButtons'),

  // AI panel
  guidePhotoInput:  document.getElementById('guidePhotoInput'),
  guidePhotoName:   document.getElementById('guidePhotoName'),
  qualityButtons:   document.getElementById('qualityButtons'),
  aiPresetButtons:  document.getElementById('aiPresetButtons'),
  generateButton:   document.getElementById('generateButton'),
  copyPromptButton: document.getElementById('copyPromptButton'),

  aiResultArea:    document.getElementById('aiResultArea'),
  backToCanvasBtn: document.getElementById('backToCanvasBtn'),
  originalPreview: document.getElementById('originalPreview'),
  generatedPreview:document.getElementById('generatedPreview'),
  compareDivider:  document.getElementById('compareDivider'),
  compareRange:    document.getElementById('compareRange'),
  promptOutput:    document.getElementById('promptOutput'),
  presetBadge:     document.getElementById('presetBadge'),
};

// ============================================================
// BOOT
// ============================================================

function boot() {
  buildPresetButtons();
  buildPatternButtons();
  buildAiPresetButtons();
  buildQualityButtons();
  wireEvents();

  const ro = new ResizeObserver(() => resizeCanvas());
  ro.observe(refs.canvasWrapper);

  render();
}

// ============================================================
// BUILD SIDEBAR UI
// ============================================================

function buildPresetButtons() {
  refs.presetButtons.innerHTML = '';
  for (const [key, preset] of Object.entries(PRESETS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'preset-btn secondary-button';
    btn.dataset.key = key;
    const swatches = preset.colors.slice(0, 4).map(c =>
      `<span class="swatch" style="background:${c}"></span>`
    ).join('');
    btn.innerHTML = `
      <span class="preset-emoji">${preset.emoji}</span>
      <span class="preset-info">
        <span class="preset-name">${preset.name}</span>
        <span class="preset-brief">${preset.brief}</span>
      </span>
      <span class="preset-swatches">${swatches}</span>
    `;
    btn.addEventListener('click', () => { state.preset = key; render(); });
    refs.presetButtons.appendChild(btn);
  }
}

function buildPatternButtons() {
  refs.patternButtons.innerHTML = '';
  for (const [key, pat] of Object.entries(PATTERNS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pattern-btn secondary-button';
    btn.dataset.key = key;
    btn.innerHTML = `<span class="pattern-name">${pat.name}</span><span class="pattern-brief">${pat.brief}</span>`;
    btn.addEventListener('click', () => { state.pattern = key; render(); });
    refs.patternButtons.appendChild(btn);
  }
}

function buildAiPresetButtons() {
  refs.aiPresetButtons.innerHTML = '';
  for (const [key, preset] of Object.entries(PRESETS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-preset-btn secondary-button';
    btn.dataset.key = key;
    btn.textContent = `${preset.emoji} ${preset.name}`;
    btn.addEventListener('click', () => { state.aiPreset = key; renderAi(); });
    refs.aiPresetButtons.appendChild(btn);
  }
}

function buildQualityButtons() {
  refs.qualityButtons.innerHTML = '';
  for (const [key, q] of Object.entries(AI_QUALITY)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quality-btn secondary-button';
    btn.dataset.key = key;
    btn.innerHTML = `${q.name}<small>${q.brief}</small><small>${q.cost}</small>`;
    btn.addEventListener('click', () => { state.aiQuality = key; renderAi(); });
    refs.qualityButtons.appendChild(btn);
  }
}

// ============================================================
// WIRE EVENTS
// ============================================================

function wireEvents() {
  refs.photoInput.addEventListener('change', e => handlePhotoFile(e.target.files?.[0]));
  refs.photoInput2.addEventListener('change', e => handlePhotoFile(e.target.files?.[0]));

  refs.drawToggleBtn.addEventListener('click', toggleDrawMode);
  refs.undoBtn.addEventListener('click', undo);
  refs.clearBtn.addEventListener('click', clearAll);
  refs.viewToggleBtn.addEventListener('click', () => {
    state.showLights = !state.showLights;
    if (!state.showLights && state.isDrawMode) { state.isDrawMode = false; }
    render();
  });
  refs.downloadBtn.addEventListener('click', downloadMockup);
  refs.backToCanvasBtn.addEventListener('click', () => {
    refs.aiResultArea.classList.add('hidden');
    refs.canvasArea.classList.remove('hidden');
  });

  // Canvas drawing events
  const c = refs.canvas;
  c.addEventListener('click',      onCanvasClick);
  c.addEventListener('dblclick',   onCanvasDoubleClick);
  c.addEventListener('mousemove',  onCanvasMouseMove);
  c.addEventListener('mouseleave', onCanvasMouseLeave);
  c.addEventListener('contextmenu', e => { e.preventDefault(); if (state.isDrawMode) finishSegment(); });

  // Touch support for tablets / phones
  c.addEventListener('touchstart', onTouchStart, { passive: false });
  c.addEventListener('touchmove',  onTouchMove,  { passive: false });

  // AI panel
  refs.guidePhotoInput.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.guidePhotoDataUrl = reader.result;
      state.guidePhotoName = file.name;
      refs.guidePhotoName.textContent = file.name;
      renderAi();
    };
    reader.readAsDataURL(file);
  });
  refs.generateButton.addEventListener('click', generateAiMockup);
  refs.copyPromptButton.addEventListener('click', copyAiPrompt);
  refs.compareRange.addEventListener('input', e => {
    state.compareSplit = Number(e.target.value);
    renderCompare();
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && state.isDrawMode) finishSegment();
    if (e.key === 'Escape' && state.isDrawMode) { state.current = []; renderCanvas(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  });
}

// ============================================================
// PHOTO HANDLING
// ============================================================

async function handlePhotoFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.photoDataUrl = reader.result;
    state.segments = [];
    state.current = [];
    state.generatedImageDataUrl = '';

    refs.housePhoto.src = reader.result;
    refs.originalPreview.src = reader.result;
    const short = file.name.length > 26 ? file.name.slice(0, 23) + '…' : file.name;
    refs.photoName.textContent = file.name;
    refs.photoLabelText.textContent = short;

    refs.emptyState.classList.add('hidden');
    refs.aiResultArea.classList.add('hidden');
    refs.canvasArea.classList.remove('hidden');

    refs.housePhoto.onload = () => {
      setTimeout(() => { resizeCanvas(); render(); }, 30);
    };
  };
  reader.readAsDataURL(file);
}

// ============================================================
// CANVAS RESIZE
// ============================================================

function resizeCanvas() {
  const w = refs.canvasWrapper.clientWidth;
  const h = refs.canvasWrapper.clientHeight;
  if (!w || !h) return;

  // Scale existing points proportionally
  if (state.canvasW > 0 && state.canvasH > 0) {
    const sx = w / state.canvasW;
    const sy = h / state.canvasH;
    for (const seg of state.segments)
      for (const pt of seg) { pt.x *= sx; pt.y *= sy; }
    for (const pt of state.current) { pt.x *= sx; pt.y *= sy; }
  }

  state.canvasW = w;
  state.canvasH = h;
  refs.canvas.width  = w;
  refs.canvas.height = h;
  renderCanvas();
}

// ============================================================
// CANVAS EVENTS
// ============================================================

let _lastClickTime = 0;

function onCanvasClick(e) {
  if (!state.isDrawMode) return;
  const now = Date.now();
  // Ignore the click that comes right before a dblclick
  if (now - _lastClickTime < 380) return;
  _lastClickTime = now;
  state.current.push(getCanvasPos(e));
  renderCanvas();
}

function onCanvasDoubleClick(e) {
  if (!state.isDrawMode) return;
  // Remove the extra point added by the preceding click event
  if (state.current.length > 0) state.current.pop();
  finishSegment();
}

function onCanvasMouseMove(e) {
  const pos = getCanvasPos(e);
  state.mouseX = pos.x;
  state.mouseY = pos.y;
  if (state.isDrawMode) renderCanvas();
}

function onCanvasMouseLeave() {
  state.mouseX = null;
  state.mouseY = null;
  if (state.isDrawMode) renderCanvas();
}

let _lastTouchTime = 0;
let _lastTouchPos  = null;

function onTouchStart(e) {
  if (!state.isDrawMode) return;
  e.preventDefault();
  const t = e.touches[0];
  const pos = getCanvasPosFromXY(t.clientX, t.clientY);
  const now = Date.now();

  if (_lastTouchPos &&
      Math.hypot(pos.x - _lastTouchPos.x, pos.y - _lastTouchPos.y) < 40 &&
      now - _lastTouchTime < 450) {
    // Double-tap: finish segment
    if (state.current.length > 0) state.current.pop();
    finishSegment();
    _lastTouchPos = null;
    return;
  }

  _lastTouchTime = now;
  _lastTouchPos  = pos;
  state.current.push(pos);
  renderCanvas();
}

function onTouchMove(e) {
  if (!state.isDrawMode) return;
  e.preventDefault();
  const t = e.touches[0];
  const pos = getCanvasPosFromXY(t.clientX, t.clientY);
  state.mouseX = pos.x;
  state.mouseY = pos.y;
  renderCanvas();
}

function getCanvasPos(e) {
  const r = refs.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function getCanvasPosFromXY(cx, cy) {
  const r = refs.canvas.getBoundingClientRect();
  return { x: cx - r.left, y: cy - r.top };
}

// ============================================================
// DRAWING ACTIONS
// ============================================================

function toggleDrawMode() {
  if (state.isDrawMode) {
    finishSegment();
    state.isDrawMode = false;
  } else {
    if (!state.photoDataUrl) return;
    state.isDrawMode = true;
    state.showLights = false;
  }
  render();
}

function finishSegment() {
  if (state.current.length >= 2) {
    state.segments.push([...state.current]);
  }
  state.current = [];
}

function undo() {
  if (state.current.length > 0) {
    state.current.pop();
  } else if (state.segments.length > 0) {
    state.current = state.segments.pop();
    state.current.pop();
  }
  renderCanvas();
  updateStats();
}

function clearAll() {
  state.segments = [];
  state.current  = [];
  renderCanvas();
  updateStats();
}

// ============================================================
// RENDER CYCLE
// ============================================================

function render() {
  // Draw mode toggle button
  refs.drawToggleBtn.classList.toggle('is-active', state.isDrawMode);
  refs.drawToggleBtn.innerHTML = state.isDrawMode
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Done Drawing`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="11" cy="11" r="2"/></svg> Draw Roofline`;

  // Canvas cursor
  refs.canvas.style.cursor = state.isDrawMode ? 'crosshair' : 'default';

  // Toolbar
  const inDraw = state.isDrawMode;
  refs.modeIndicator.textContent = inDraw ? 'Drawing' : (state.showLights ? 'Lights Preview' : 'Roofline');
  refs.modeIndicator.className = 'mode-badge ' + (inDraw ? 'mode-draw' : 'mode-preview');
  refs.viewToggleBtn.textContent = state.showLights ? '📐 Edit Roofline' : '💡 Preview Lights';
  refs.viewToggleBtn.classList.toggle('hidden', inDraw);

  // Preset badge in toolbar
  const p = PRESETS[state.preset];
  refs.previewPreset.textContent = state.showLights && !inDraw ? `${p.emoji} ${p.name}` : '';

  // Canvas tip
  refs.canvasTip.classList.toggle('hidden', !inDraw);

  // Preset buttons
  for (const btn of refs.presetButtons.querySelectorAll('.preset-btn'))
    btn.classList.toggle('is-active', btn.dataset.key === state.preset);

  // Pattern buttons
  for (const btn of refs.patternButtons.querySelectorAll('.pattern-btn'))
    btn.classList.toggle('is-active', btn.dataset.key === state.pattern);

  // Draw hint
  if (!state.photoDataUrl) {
    refs.drawHint.textContent = 'Upload a photo to start drawing.';
  } else if (inDraw) {
    refs.drawHint.textContent = 'Click to add points · Double-click or Enter to finish · Right-click to cancel';
  } else if (state.segments.length > 0) {
    updateStats();
    return; // updateStats calls renderCanvas
  } else {
    refs.drawHint.textContent = 'Click "Draw Roofline" then click along the rooflines.';
  }

  renderCanvas();
}

function updateStats() {
  if (state.segments.length === 0) {
    refs.bulbCount.textContent = 'Draw the roofline to see bulb count.';
    refs.drawHint.textContent = state.photoDataUrl
      ? 'Click "Draw Roofline" then click along the rooflines.'
      : 'Upload a photo to start drawing.';
    return;
  }
  const total = countBulbs();
  const segs  = state.segments.length;
  refs.bulbCount.textContent = `${segs} segment${segs !== 1 ? 's' : ''} · ~${total} bulbs at current spacing`;
  refs.drawHint.textContent  = `${segs} segment${segs !== 1 ? 's' : ''} drawn · ~${total} bulbs`;
}

function countBulbs() {
  const pat = PATTERNS[state.pattern];
  let idx = 0, on = 0;
  for (const seg of state.segments) {
    for (const _ of walkPath(seg, BULB_SPACING)) {
      if (pat.pattern[idx % pat.pattern.length]) on++;
      idx++;
    }
  }
  return on;
}

// ============================================================
// CANVAS RENDERING
// ============================================================

function renderCanvas() {
  const ctx = refs.canvas.getContext('2d');
  ctx.clearRect(0, 0, refs.canvas.width, refs.canvas.height);

  if (state.isDrawMode || !state.showLights) {
    renderRouteLines(ctx);
  } else {
    renderLights(ctx);
  }
}

function renderRouteLines(ctx) {
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  const allSegs = [
    ...state.segments,
    ...(state.current.length > 0 ? [state.current] : []),
  ];

  for (const seg of allSegs) {
    if (seg.length < 2) continue;
    ctx.strokeStyle = 'rgba(255, 55, 55, 0.92)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = 'rgba(255, 80, 80, 0.6)';
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(seg[0].x, seg[0].y);
    for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Anchor dots
  for (const seg of allSegs) {
    for (const pt of seg) {
      ctx.fillStyle   = '#ff4444';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 1.5;
      ctx.shadowBlur  = 0;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Ghost preview line to cursor
  if (state.isDrawMode && state.current.length > 0 && state.mouseX !== null) {
    const last = state.current[state.current.length - 1];
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.45)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(state.mouseX, state.mouseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Preview cursor dot
    ctx.fillStyle  = 'rgba(255, 100, 100, 0.7)';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(state.mouseX, state.mouseY, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderLights(ctx) {
  const preset = PRESETS[state.preset];
  const pat    = PATTERNS[state.pattern];
  let globalIdx = 0;

  for (const seg of state.segments) {
    for (const pt of walkPath(seg, BULB_SPACING)) {
      if (pat.pattern[globalIdx % pat.pattern.length]) {
        drawBulb(ctx, pt.x, pt.y, preset.colors[globalIdx % preset.colors.length]);
      }
      globalIdx++;
    }
  }
}

function drawBulb(ctx, x, y, color) {
  // Soft outer glow
  const grd = ctx.createRadialGradient(x, y, 0, x, y, GLOW_RADIUS);
  grd.addColorStop(0,   hexRgba(color, 0.65));
  grd.addColorStop(0.4, hexRgba(color, 0.28));
  grd.addColorStop(1,   hexRgba(color, 0));
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, GLOW_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Main bulb body
  ctx.shadowColor = color;
  ctx.shadowBlur  = 10;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(x, y, BULB_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Bright specular core
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#ffffff';
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.arc(x, y, BULB_RADIUS * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// ============================================================
// PATH WALKING — place points every `spacing` px along polyline
// ============================================================

function walkPath(points, spacing) {
  const result = [];
  if (points.length < 2) return result;
  let distToNext = spacing * 0.5;
  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i].x,   ay = points[i].y;
    const bx = points[i+1].x, by = points[i+1].y;
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 0.001) continue;
    let d = distToNext;
    while (d <= len) {
      const t = d / len;
      result.push({ x: ax + dx * t, y: ay + dy * t });
      d += spacing;
    }
    distToNext = d - len;
  }
  return result;
}

// ============================================================
// DOWNLOAD — composite at full photo resolution
// ============================================================

function downloadMockup() {
  if (!state.photoDataUrl) {
    alert('Upload a house photo first.');
    return;
  }
  if (state.segments.length === 0) {
    alert('Draw the roofline first, then download.');
    return;
  }

  const img = refs.housePhoto;
  const iw  = img.naturalWidth;
  const ih  = img.naturalHeight;

  // How the image is laid out within the canvas (object-fit: contain)
  const bounds = getImageBoundsInCanvas(iw, ih);
  if (!bounds) return;

  const oc  = document.createElement('canvas');
  oc.width  = iw;
  oc.height = ih;
  const ctx = oc.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Scale factors from canvas px → natural image px
  const sx = iw / bounds.w;
  const sy = ih / bounds.h;
  const scale = (sx + sy) / 2;

  const spacing    = BULB_SPACING    * scale;
  const bulbRadius = BULB_RADIUS     * scale;
  const glowRadius = GLOW_RADIUS     * scale;

  const preset = PRESETS[state.preset];
  const pat    = PATTERNS[state.pattern];
  let globalIdx = 0;

  for (const seg of state.segments) {
    const scaled = seg.map(pt => ({
      x: (pt.x - bounds.x) * sx,
      y: (pt.y - bounds.y) * sy,
    }));
    for (const pt of walkPath(scaled, spacing)) {
      if (pat.pattern[globalIdx % pat.pattern.length]) {
        drawBulbHiRes(ctx, pt.x, pt.y, preset.colors[globalIdx % preset.colors.length], bulbRadius, glowRadius);
      }
      globalIdx++;
    }
  }

  const link = document.createElement('a');
  link.href     = oc.toDataURL('image/png');
  link.download = `permabright-${state.preset}-mockup.png`;
  link.click();
}

function drawBulbHiRes(ctx, x, y, color, radius, glowRadius) {
  const grd = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  grd.addColorStop(0,   hexRgba(color, 0.65));
  grd.addColorStop(0.4, hexRgba(color, 0.28));
  grd.addColorStop(1,   hexRgba(color, 0));
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = color;
  ctx.shadowBlur  = radius * 2;
  ctx.fillStyle   = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#ffffff';
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function getImageBoundsInCanvas(iw, ih) {
  const cw = refs.canvas.width;
  const ch = refs.canvas.height;
  if (!cw || !ch || !iw || !ih) return null;
  const imgAspect    = iw / ih;
  const canvasAspect = cw / ch;
  let x, y, w, h;
  if (imgAspect > canvasAspect) {
    w = cw; h = cw / imgAspect;
    x = 0;  y = (ch - h) / 2;
  } else {
    h = ch; w = ch * imgAspect;
    y = 0;  x = (cw - w) / 2;
  }
  return { x, y, w, h };
}

// ============================================================
// UTILITIES
// ============================================================

function hexRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ============================================================
// AI GENERATION (legacy / optional)
// ============================================================

function buildAiPrompt() {
  const preset   = PRESETS[state.aiPreset];
  const quality  = AI_QUALITY[state.aiQuality];
  const guideIntro = state.guidePhotoDataUrl
    ? ['Two matching images are provided.',
       '- Image 1 is the clean house photo and is the base image.',
       '- Image 2 is the same house with the intended install path marked in red.',
       'Treat the red-marked guide image as authoritative for light placement.'].join('\n')
    : ['One house photo is provided.',
       'If the photo includes red roofline markup, use that markup as the authoritative install guide but remove it from the final result.'].join('\n');

  return [
    'Create a polished homeowner-facing mockup for Permabright permanent lighting.',
    '',
    guideIntro,
    '',
    'Placement rules:',
    '- Follow only the marked install path.',
    '- Lights must sit on the lower front-facing fascia or eave line under the roof edge.',
    '- Never trace the peak lines on top of the roof unless explicitly marked in red.',
    '- Show individual permanent bulbs or pucks spaced about 8 inches apart.',
    '- Each bulb should have a subtle downward-facing glow, not a thick glowing rope.',
    '',
    'Output requirements:',
    '- Convert the scene into a realistic dusk/night exterior preview.',
    '- Keep the home recognizable and preserve the architecture and landscaping.',
    `- Lighting preset: ${preset.aiEffect}`,
    `- Quality mode: ${quality.note}`,
    '- The result should look like a beautiful sales illustration for a homeowner.',
    '- Do not show any red lines, measurement notes, or markup in the final image.',
    '- Do not add decorations or unrelated holiday props.',
    '',
    'Style target: clean · upscale · realistic · strong curb appeal',
  ].join('\n');
}

function renderAi() {
  // AI preset buttons
  for (const btn of refs.aiPresetButtons.querySelectorAll('.ai-preset-btn'))
    btn.classList.toggle('is-active', btn.dataset.key === state.aiPreset);
  // Quality buttons
  for (const btn of refs.qualityButtons.querySelectorAll('.quality-btn'))
    btn.classList.toggle('is-active', btn.dataset.key === state.aiQuality);
  refs.promptOutput.value = buildAiPrompt();
  refs.presetBadge.textContent = PRESETS[state.aiPreset].name;
  renderCompare();
}

async function generateAiMockup() {
  if (!state.photoDataUrl && !state.guidePhotoDataUrl) {
    alert('Upload the house photo first.');
    return;
  }
  refs.generateButton.disabled = true;
  refs.generateButton.textContent = 'Generating…';

  try {
    const res = await fetch('/api/mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: buildAiPrompt(),
        cleanPhotoDataUrl: state.photoDataUrl,
        guidePhotoDataUrl: state.guidePhotoDataUrl,
        preset: state.aiPreset,
        qualityMode: state.aiQuality,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');
    state.generatedImageDataUrl = data.imageDataUrl;
    refs.generatedPreview.src   = data.imageDataUrl;

    refs.canvasArea.classList.add('hidden');
    refs.aiResultArea.classList.remove('hidden');
    renderCompare();
  } catch (err) {
    alert(`Generation failed: ${err.message}`);
  } finally {
    refs.generateButton.disabled = false;
    refs.generateButton.textContent = 'Generate AI Mockup';
    renderAi();
  }
}

async function copyAiPrompt() {
  try {
    await navigator.clipboard.writeText(refs.promptOutput.value);
  } catch { /* ignore */ }
}

function renderCompare() {
  const split = state.compareSplit;
  if (refs.generatedPreview.src) {
    refs.generatedPreview.style.clipPath = `inset(0 ${100 - split}% 0 0)`;
  }
  refs.compareDivider.style.left = `${split}%`;
  const hasGen = Boolean(state.generatedImageDataUrl);
  refs.previewViewport.classList.toggle('has-original', Boolean(state.photoDataUrl));
  refs.previewViewport.classList.toggle('has-generated', hasGen);
}

// ============================================================
// GO
// ============================================================

boot();
