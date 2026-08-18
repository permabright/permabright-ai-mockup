// ============================================================
// CONFIGURATION
// ============================================================

const PRESETS = {
  accent: {
    name: 'Accent',
    emoji: '✨',
    brief: 'Warm architectural white',
    colors: ['#ffe8c0'],
    aiEffect: 'Warm white (2700K) individual LED puck lights. Each puck casts a rich warm-white downward glow that washes the stone or brick facade below with soft golden-white light. The wall beneath the roofline glows warmly. The sky is deep blue-black with scattered stars. No decorations.',
  },
  warmWhite: {
    name: 'Warm White',
    emoji: '🕯️',
    brief: 'Classic warm white',
    colors: ['#fff3d4'],
    aiEffect: 'Warm white (3000K) individual LED puck lights mounted on the fascia. Each light projects a warm amber-white downward wash onto the home exterior below. The facade is beautifully illuminated by the warm glow. Deep navy night sky with stars. No decorations.',
  },
  coolWhite: {
    name: 'Cool White',
    emoji: '💎',
    brief: 'Bright modern white',
    colors: ['#ddeeff'],
    aiEffect: 'Crisp cool white (6000K) individual LED puck lights. Each puck emits a bright blue-white downward glow that washes the home facade below with clean modern white light. The stone or brick wall beneath the roofline glows bright white. Dark night sky with stars. No decorations.',
  },
  christmas: {
    name: 'Christmas',
    emoji: '🎄',
    brief: 'Red, green & white',
    colors: ['#ff2020', '#15cc40', '#ffffff'],
    aiEffect: 'Alternating individual red, green, and white LED puck lights. Each colored puck washes the facade below it in its color — red sections glow red on the wall, green sections glow green, white sections glow white. The combined effect creates a festive Christmas color wash along the entire roofline. Add a tasteful evergreen wreath with a red bow on the front door. Deep dark night sky with bright stars.',
  },
  fourth: {
    name: '4th of July',
    emoji: '🎆',
    brief: 'Red, white & blue',
    colors: ['#ff1515', '#ffffff', '#1155ff'],
    aiEffect: 'Alternating individual red, white, and blue LED puck lights. Red pucks wash the wall below in red, white pucks in white, blue pucks in vivid blue — creating a patriotic color-washed facade. The home exterior glows with bold red, white, and blue sections. Deep dark night sky. Optional: small American flags near the entrance.',
  },
  halloween: {
    name: 'Halloween',
    emoji: '🎃',
    brief: 'Orange & purple',
    colors: ['#ff6600', '#aa00ee'],
    aiEffect: 'Alternating individual orange and purple LED puck lights. Orange pucks cast a vivid orange glow washing the wall below, purple pucks cast deep purple — creating a dramatic Halloween color scheme on the facade. The home looks spooky and festive. Dark night sky with stars. Add one or two carved jack-o-lanterns glowing near the front entrance.',
  },
  easter: {
    name: 'Easter',
    emoji: '🐣',
    brief: 'Pastel spring colors',
    colors: ['#ff88cc', '#ffee44', '#cc55ff', '#55ee88'],
    aiEffect: 'Rotating pastel pink, yellow, lavender, and mint green individual LED puck lights. Each colored puck washes the wall below in its soft pastel color — creating a cheerful, spring-celebration look on the facade. Soft glowing pastels across the home exterior. Deep twilight sky. Optional: small spring flower arrangements near the entrance.',
  },
  newYear: {
    name: "New Year's",
    emoji: '🥂',
    brief: 'Gold, white & silver',
    colors: ['#ffd700', '#ffffff', '#c0c0c0'],
    aiEffect: 'Alternating gold, white, and silver individual LED puck lights. Gold pucks cast rich golden downward wash, white pucks bright white, silver pucks a cool silver-white — creating an elegant celebration look. The home glows with luxurious gold and white light. Dark night sky with extra bright stars and a subtle starburst effect.',
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

  nightMode: false,
  showLights: true,
  segments: [],   // each segment is always [{x,y}, {x,y}] — exactly 2 points
  mouseX: null,
  mouseY: null,
  canvasW: 0,
  canvasH: 0,

  // null | {type:'new', x0, y0} | {type:'endpoint', segIdx, ptIdx}
  drawDrag: null,
  stars: null,

  preset: 'christmas',
  pattern: 'all',

  // AI gen state
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

  drawRooflineBtn: document.getElementById('drawRooflineBtn'),
  undoBtn:       document.getElementById('undoBtn'),
  clearBtn:      document.getElementById('clearBtn'),
  canvasFloatBar:document.getElementById('canvasFloatBar'),
  viewToggleBtn: document.getElementById('viewToggleBtn'),
  modeIndicator: document.getElementById('modeIndicator'),
  previewPreset: document.getElementById('previewPreset'),
  downloadBtn:      document.getElementById('downloadBtn'),
  bulbCount:        document.getElementById('bulbCount'),
  saveRooflineBtn:  document.getElementById('saveRooflineBtn'),

  aiPresetButtons:  document.getElementById('aiPresetButtons'),
  qualityButtons:   document.getElementById('qualityButtons'),
  generateButton:   document.getElementById('generateButton'),
  copyPromptButton: document.getElementById('copyPromptButton'),

  aiResultArea:    document.getElementById('aiResultArea'),
  previewViewport: document.getElementById('previewViewport'),
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

function buildAiPresetButtons() {
  refs.aiPresetButtons.innerHTML = '';
  for (const [key, preset] of Object.entries(PRESETS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-preset-btn secondary-button';
    btn.dataset.key = key;
    btn.textContent = `${preset.emoji} ${preset.name}`;
    btn.addEventListener('click', () => {
      state.aiPreset = key;
      state.preset   = key;   // keep canvas preset in sync
      render();
      renderAi();
    });
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

  refs.undoBtn.addEventListener('click', undo);
  refs.clearBtn.addEventListener('click', clearAll);
  refs.viewToggleBtn.addEventListener('click', () => {
    state.showLights = !state.showLights;
    render();
  });
  refs.downloadBtn.addEventListener('click', downloadMockup);
  refs.saveRooflineBtn?.addEventListener('click', saveRooflinePhoto);
  refs.backToCanvasBtn.addEventListener('click', () => {
    refs.aiResultArea.classList.add('hidden');
    refs.canvasArea.classList.remove('hidden');
  });

  // Canvas drawing — pointer events for unified mouse + touch
  const c = refs.canvas;
  c.addEventListener('pointerdown',  onPointerDown);
  c.addEventListener('pointermove',  onPointerMove, { passive: false });
  c.addEventListener('pointerup',    onPointerUp);
  c.addEventListener('pointercancel', () => { state.drawDrag = null; renderCanvas(); });
  c.addEventListener('mouseleave', () => {
    state.mouseX = null;
    state.mouseY = null;
    if (!state.showLights) renderCanvas();
  });

  // AI panel
  refs.generateButton.addEventListener('click', generateAiMockup);
  refs.copyPromptButton.addEventListener('click', copyAiPrompt);
  refs.compareRange.addEventListener('input', e => {
    state.compareSplit = Number(e.target.value);
    renderCompare();
  });

  // Keyboard
  document.addEventListener('keydown', e => {
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
    state.drawDrag = null;
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
      setTimeout(() => {
        resizeCanvas();
        render();
      }, 30);
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
    if (state.drawDrag?.type === 'new') {
      state.drawDrag.x0 *= sx;
      state.drawDrag.y0 *= sy;
    }
  }

  state.canvasW = w;
  state.canvasH = h;
  refs.canvas.width  = w;
  refs.canvas.height = h;
  renderCanvas();
}

// ============================================================
// POINTER EVENTS — unified mouse + touch drawing
// ============================================================

function getCanvasPos(e) {
  const r = refs.canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onPointerDown(e) {
  const pos = getCanvasPos(e);

  // Check if near an endpoint (within 18px) → drag it
  for (let si = 0; si < state.segments.length; si++) {
    for (let pi = 0; pi < state.segments[si].length; pi++) {
      const pt = state.segments[si][pi];
      if (Math.hypot(pt.x - pos.x, pt.y - pos.y) <= 18) {
        state.drawDrag = { type: 'endpoint', segIdx: si, ptIdx: pi };
        refs.canvas.setPointerCapture(e.pointerId);
        refs.canvas.style.cursor = 'grabbing';
        return;
      }
    }
  }

  // Start drawing a new 2-point segment
  state.drawDrag = { type: 'new', x0: pos.x, y0: pos.y };
  refs.canvas.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
  if (state.drawDrag) e.preventDefault();

  const pos = getCanvasPos(e);
  state.mouseX = pos.x;
  state.mouseY = pos.y;

  if (state.drawDrag?.type === 'endpoint') {
    const { segIdx, ptIdx } = state.drawDrag;
    state.segments[segIdx][ptIdx] = { x: pos.x, y: pos.y };
    renderCanvas();
    updateStats();
  } else if (state.drawDrag?.type === 'new') {
    // Show preview line — always render route lines during drag
    renderCanvas();
  }
}

function onPointerUp(e) {
  if (!state.drawDrag) return;
  const pos = getCanvasPos(e);

  if (state.drawDrag.type === 'new') {
    const dx = pos.x - state.drawDrag.x0;
    const dy = pos.y - state.drawDrag.y0;
    if (Math.hypot(dx, dy) > 8) {
      state.segments.push([
        { x: state.drawDrag.x0, y: state.drawDrag.y0 },
        { x: pos.x, y: pos.y }
      ]);
      updateStats();
    }
  }
  // endpoint drag: position already updated in pointermove

  state.drawDrag = null;
  refs.canvas.style.cursor = state.photoDataUrl ? 'crosshair' : 'default';
  renderCanvas();
}

// ============================================================
// DRAWING ACTIONS
// ============================================================

function undo() {
  if (state.drawDrag?.type === 'new') {
    state.drawDrag = null;
  } else if (state.segments.length > 0) {
    state.segments.pop();
  }
  renderCanvas();
  updateStats();
}

function clearAll() {
  state.segments = [];
  state.drawDrag  = null;
  renderCanvas();
  updateStats();
}

// ============================================================
// RENDER CYCLE
// ============================================================

function render() {
  // Floating toolbar
  refs.canvasFloatBar.classList.toggle('hidden', !state.photoDataUrl);

  // Canvas cursor
  refs.canvas.style.cursor = state.photoDataUrl ? 'crosshair' : 'default';

  // Toolbar mode badge
  const dragging = Boolean(state.drawDrag);
  refs.modeIndicator.textContent = dragging ? 'Drawing'
    : (state.showLights ? 'Lights Preview' : 'Roofline');
  refs.modeIndicator.className = 'mode-badge ' + (dragging ? 'mode-draw' : 'mode-preview');

  refs.viewToggleBtn.textContent = state.showLights ? '📐 Roofline' : '💡 Preview Lights';

  // Preset badge in toolbar
  const p = PRESETS[state.preset];
  refs.previewPreset.textContent = state.showLights ? `${p.emoji} ${p.name}` : '';

  // Night mode on photo
  refs.housePhoto.classList.toggle('night-mode', state.nightMode && state.showLights);

  // AI preset buttons
  for (const btn of refs.aiPresetButtons.querySelectorAll('.ai-preset-btn'))
    btn.classList.toggle('is-active', btn.dataset.key === state.aiPreset);

  updateStats();
  renderCanvas();
}

function updateStats() {
  if (state.segments.length === 0) {
    refs.bulbCount.textContent = 'Draw the roofline to see bulb count.';
    return;
  }
  const total = countBulbs();
  const segs  = state.segments.length;
  refs.bulbCount.textContent = `${segs} segment${segs !== 1 ? 's' : ''} · ~${total} bulbs at current spacing`;
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

  if (!state.showLights || state.drawDrag) {
    renderRouteLines(ctx);
  } else {
    if (state.nightMode) drawStars(ctx);
    renderLights(ctx);
  }
}

function renderRouteLines(ctx) {
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Draw completed segments
  for (const seg of state.segments) {
    if (seg.length < 2) continue;
    ctx.strokeStyle = 'rgba(255,30,30,0.95)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255,80,80,0.5)';
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.moveTo(seg[0].x, seg[0].y);
    ctx.lineTo(seg[1].x, seg[1].y);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Endpoints: filled white circle with red border
    for (const pt of seg) {
      ctx.fillStyle   = '#ffffff';
      ctx.strokeStyle = 'rgba(255,30,30,0.95)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Preview line while drawing a new segment
  if (state.drawDrag?.type === 'new' && state.mouseX !== null) {
    ctx.strokeStyle = 'rgba(255,30,30,0.6)';
    ctx.lineWidth   = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(state.drawDrag.x0, state.drawDrag.y0);
    ctx.lineTo(state.mouseX, state.mouseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Start dot
    ctx.fillStyle = 'rgba(255,30,30,0.8)';
    ctx.beginPath();
    ctx.arc(state.drawDrag.x0, state.drawDrag.y0, 5, 0, Math.PI * 2);
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
// AI GENERATION
// ============================================================

function buildAiPrompt() {
  const preset  = PRESETS[state.aiPreset];
  const quality = AI_QUALITY[state.aiQuality];

  const hasGuide = state.segments.length > 0;

  const guideIntro = hasGuide
    ? [
        'You are given TWO images of the same house:',
        '  • Image 1 — the clean daytime house photo. This is your base.',
        '  • Image 2 — the same house with the roofline marked in red. The red lines show EXACTLY where the permanent LED lights are installed. Follow them precisely.',
      ].join('\n')
    : [
        'You are given ONE house photo.',
        'If red markup lines are visible, treat them as the exact install path for the lights and remove them from the final image.',
      ].join('\n');

  return [
    '=== PERMABRIGHT PERMANENT LIGHTING MOCKUP ===',
    '',
    guideIntro,
    '',
    '--- WHAT THIS PRODUCT LOOKS LIKE ---',
    'Permabright permanent lighting uses individual small LED puck lights (about the size of a quarter) mounted flush on the front face of the fascia board — the trim board directly under the roof edge. The pucks are spaced approximately 6–8 inches apart and follow every roofline angle including up gable peaks and along horizontal eave runs. Each individual puck emits a focused downward-facing glow that washes the stone, brick, or siding wall directly below it with colored light. The effect is: bright individual light points on the fascia + a rich colored wash of light flowing down the exterior wall below. It does NOT look like rope lights, neon strips, or icicle lights — it looks like evenly-spaced bright point lights with strong wall wash.',
    '',
    '--- YOUR TASK ---',
    'Transform the daytime house photo into a photorealistic night scene showing this permanent lighting installed and glowing. The result should look like an actual photo taken at night — not a rendering or illustration.',
    '',
    '--- LIGHTING SPEC ---',
    preset.aiEffect,
    '',
    '--- RULES ---',
    '1. Place lights ONLY on the fascia board edges shown in the red guide (or along all visible eave/fascia lines if no guide). Follow every angle — horizontal eaves AND sloped gable edges.',
    '2. Show individual distinct puck light points on the fascia — NOT a continuous glowing strip.',
    '3. Each puck must produce a visible downward glow washing the wall below with the light color.',
    '4. Convert the sky to a deep blue-black night sky with a stunning Milky Way effect — hundreds of visible stars of varying brightness, with a subtle blue-violet gradient near the horizon fading to near-black overhead. The stars should be numerous and beautiful, like a clear rural night far from city lights.',
    '5. Keep the house architecture 100% identical — same windows, doors, stone, landscaping, everything.',
    '6. Remove all red markup lines from the final image.',
    '7. The lawn and landscaping should look naturally lit by the colored light spilling downward.',
    `8. Quality: ${quality.note}`,
    '',
    'Final result should look like a professional night photography shot of a luxury home with Permabright permanent LED lighting — stunning, realistic, sales-ready.',
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

// ============================================================
// CAPTURE GUIDE PHOTO — render canvas lines onto image
// ============================================================

function saveRooflinePhoto() {
  if (!state.photoDataUrl || !state.segments.length) {
    alert('Draw the roofline first.');
    return;
  }
  const dataUrl = captureGuidePhoto();
  if (!dataUrl) return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'roofline-guide.jpg';
  a.click();
}

function captureGuidePhoto() {
  const img = refs.housePhoto;
  const w = img.naturalWidth, h = img.naturalHeight;
  const oc = document.createElement('canvas');
  oc.width = w; oc.height = h;
  const ctx = oc.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const bounds = getImageBoundsInCanvas(w, h);
  if (!bounds) return null;
  const sx = w / bounds.w, sy = h / bounds.h;

  ctx.strokeStyle = 'rgba(255, 30, 30, 0.95)';
  ctx.lineWidth = Math.max(4, w / 200);
  ctx.lineCap = 'round';
  for (const seg of state.segments) {
    if (seg.length < 2) continue;
    ctx.beginPath();
    const p0 = seg[0];
    ctx.moveTo((p0.x - bounds.x) * sx, (p0.y - bounds.y) * sy);
    for (let i = 1; i < seg.length; i++) {
      const p = seg[i];
      ctx.lineTo((p.x - bounds.x) * sx, (p.y - bounds.y) * sy);
    }
    ctx.stroke();
  }
  return oc.toDataURL('image/jpeg', 0.92);
}

let _pollInterval = null;

async function generateAiMockup() {
  if (!state.photoDataUrl) {
    alert('Upload the house photo first.');
    return;
  }
  refs.generateButton.disabled = true;
  refs.generateButton.textContent = '⏳ Generating…';

  const guidePhotoDataUrl = state.segments.length > 0 ? captureGuidePhoto() : null;

  try {
    const res = await fetch('/api/mockup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: buildAiPrompt(),
        cleanPhotoDataUrl: state.photoDataUrl,
        guidePhotoDataUrl,
        preset: state.aiPreset,
        qualityMode: state.aiQuality,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Generation failed');

    if (data.jobId) {
      // Server returns a job ID — poll for the result
      sessionStorage.setItem('pb_jobId', data.jobId);
      refs.generateButton.textContent = '⏳ Generating… (~30s)';
      showGeneratingBanner(true);
      startPolling(data.jobId);
    } else if (data.imageDataUrl) {
      // Synchronous response (legacy)
      showResult(data.imageDataUrl);
    }
  } catch (err) {
    refs.generateButton.disabled = false;
    refs.generateButton.textContent = '✨ Generate AI Mockup';
    alert(`Generation failed: ${err.message}`);
  }
}

function showGeneratingBanner(visible) {
  let banner = document.getElementById('generatingBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'generatingBanner';
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#1a2533;color:#eef3f7;text-align:center;padding:14px 20px;font-size:.9rem;z-index:9999;border-top:1px solid rgba(255,255,255,.1)';
    document.body.appendChild(banner);
  }
  if (visible) {
    banner.textContent = '✨ AI image generating (~30 sec) — you can switch apps and come back!';
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function startPolling(jobId) {
  if (_pollInterval) clearInterval(_pollInterval);
  _pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/mockup-status?id=${jobId}`);
      const data = await res.json();
      if (data.status === 'done') {
        clearInterval(_pollInterval);
        _pollInterval = null;
        sessionStorage.removeItem('pb_jobId');
        showGeneratingBanner(false);
        showResult(data.imageDataUrl);
      } else if (data.status === 'failed') {
        clearInterval(_pollInterval);
        _pollInterval = null;
        sessionStorage.removeItem('pb_jobId');
        showGeneratingBanner(false);
        refs.generateButton.disabled = false;
        refs.generateButton.textContent = '✨ Generate AI Mockup';
        alert(`Generation failed: ${data.error}`);
      }
    } catch (_) { /* network blip, keep polling */ }
  }, 3000);
}

function showResult(imageDataUrl) {
  state.generatedImageDataUrl = imageDataUrl;
  refs.generatedPreview.src   = imageDataUrl;
  refs.generateButton.disabled = false;
  refs.generateButton.textContent = '✨ Generate AI Mockup';
  refs.canvasArea.classList.add('hidden');
  refs.aiResultArea.classList.remove('hidden');
  renderCompare();
  renderAi();
  // Vibrate to notify if supported
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

// Resume polling on page load if a job was in progress
(function resumePollingIfNeeded() {
  const jobId = sessionStorage.getItem('pb_jobId');
  if (jobId) {
    showGeneratingBanner(true);
    refs.generateButton.disabled = true;
    refs.generateButton.textContent = '⏳ Generating…';
    startPolling(jobId);
  }
})();

async function copyAiPrompt() {
  try {
    await navigator.clipboard.writeText(buildAiPrompt());
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
// NIGHT MODE — STARS
// ============================================================

function generateStars() {
  state.stars = [];
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 220; i++) {
    state.stars.push({
      x: rand(),
      y: rand() * 0.65,
      r: rand() * 1.4 + 0.3,
      a: rand() * 0.6 + 0.35,
    });
  }
}

function drawStars(ctx) {
  const w = refs.canvas.width;
  const h = refs.canvas.height;
  for (const s of state.stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle   = '#ffffff';
    ctx.shadowColor = 'rgba(200,230,255,0.8)';
    ctx.shadowBlur  = s.r * 2;
    ctx.beginPath();
    ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur  = 0;
}

// ============================================================
// GO
// ============================================================

boot();
