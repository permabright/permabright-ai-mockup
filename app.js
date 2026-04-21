const presets = {
  accent: {
    name: "Accent",
    brief: "Elegant permanent accent lighting",
    effect: "Warm white permanent puck lights with a soft premium architectural glow."
  },
  warmWhite: {
    name: "Warm White",
    brief: "Classic warm white look",
    effect: "Clean warm white permanent puck lights with subtle downward wash."
  },
  christmas: {
    name: "Christmas",
    brief: "Holiday multicolor presentation",
    effect: "Festive individual red, green, and warm white puck lights spaced evenly along the marked runs."
  },
  fourth: {
    name: "Fourth of July",
    brief: "Patriotic red white and blue",
    effect: "Individual red, white, and blue puck lights spaced evenly only on the marked runs."
  },
  halloween: {
    name: "Halloween",
    brief: "Orange and purple event lighting",
    effect: "Individual orange and purple puck lights with a dramatic but clean seasonal glow."
  }
};

const qualityModes = {
  draft: {
    name: "Draft",
    brief: "Lower cost",
    cost: "~$0.03 to $0.05",
    promptNote: "Favor a cost-efficient draft while still following the marked install path accurately."
  },
  final: {
    name: "Final",
    brief: "Best quality",
    cost: "~$0.08 to $0.15",
    promptNote: "Favor the highest quality realistic homeowner-facing render with accurate permanent bulb placement."
  }
};

const state = {
  cleanPhotoName: "",
  cleanPhotoDataUrl: "",
  guidePhotoName: "",
  guidePhotoDataUrl: "",
  selectedPreset: "accent",
  qualityMode: "final",
  generatedImageDataUrl: "",
  compareSplit: 100
};

const refs = {
  cleanPhotoInput: document.getElementById("cleanPhotoInput"),
  guidePhotoInput: document.getElementById("guidePhotoInput"),
  cleanPhotoName: document.getElementById("cleanPhotoName"),
  guidePhotoName: document.getElementById("guidePhotoName"),
  presetButtons: document.getElementById("presetButtons"),
  qualityButtons: document.getElementById("qualityButtons"),
  generateButton: document.getElementById("generateButton"),
  copyPromptButton: document.getElementById("copyPromptButton"),
  promptOutput: document.getElementById("promptOutput"),
  presetBadge: document.getElementById("presetBadge"),
  stageTitle: document.getElementById("stageTitle"),
  stageHeaderStatus: document.getElementById("stageHeaderStatus"),
  statusText: document.getElementById("statusText"),
  requirementText: document.getElementById("requirementText"),
  originalPreview: document.getElementById("originalPreview"),
  generatedPreview: document.getElementById("generatedPreview"),
  previewViewport: document.getElementById("previewViewport"),
  compareDivider: document.getElementById("compareDivider"),
  compareRange: document.getElementById("compareRange")
};

function boot() {
  buildPresetButtons();
  buildQualityButtons();
  wireEvents();
  render();
  clearOldServiceWorkers();
}

function buildPresetButtons() {
  refs.presetButtons.innerHTML = "";
  Object.entries(presets).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    button.innerHTML = `${preset.name}<small>${preset.brief}</small>`;
    button.addEventListener("click", () => {
      state.selectedPreset = key;
      render();
    });
    refs.presetButtons.appendChild(button);
  });
}

function buildQualityButtons() {
  refs.qualityButtons.innerHTML = "";
  Object.entries(qualityModes).forEach(([key, mode]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quality-button secondary-button";
    button.innerHTML = `${mode.name}<small>${mode.brief}</small><small>${mode.cost} per image</small>`;
    button.addEventListener("click", () => {
      state.qualityMode = key;
      render();
    });
    refs.qualityButtons.appendChild(button);
  });
}

function wireEvents() {
  refs.cleanPhotoInput.addEventListener("change", (event) => readImageFile(event, "clean"));
  refs.guidePhotoInput.addEventListener("change", (event) => readImageFile(event, "guide"));
  refs.generateButton.addEventListener("click", generateMockup);
  refs.copyPromptButton.addEventListener("click", copyPrompt);
  refs.compareRange.addEventListener("input", (event) => {
    state.compareSplit = Number(event.target.value);
    renderCompare();
  });
}

function clearOldServiceWorkers() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch {
    }
  });
}

function readImageFile(event, slot) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async () => {
    const preparedImage = await prepareImageDataUrl(reader.result);
    if (slot === "clean") {
      state.cleanPhotoName = file.name;
      state.cleanPhotoDataUrl = preparedImage;
      state.generatedImageDataUrl = "";
    } else {
      state.guidePhotoName = file.name;
      state.guidePhotoDataUrl = preparedImage;
    }
    render();
  };
  reader.readAsDataURL(file);
}

function buildPrompt() {
  const preset = presets[state.selectedPreset];
  const quality = qualityModes[state.qualityMode];
  const guideIntro = state.guidePhotoDataUrl
    ? [
        "Two matching images are provided.",
        "- Image 1 is the clean house photo and is the base image.",
        "- Image 2 is the same house with the intended install path marked in red.",
        "Treat the red-marked guide image as authoritative for light placement."
      ].join("\n")
    : [
        "One house photo is provided.",
        "If the photo includes red roofline markup, use that markup as the authoritative install guide but remove it from the final result."
      ].join("\n");

  return [
    "Create a polished homeowner-facing mockup for Permabright permanent lighting.",
    "",
    guideIntro,
    "",
    "Placement rules:",
    "- Follow only the marked install path.",
    "- The red guide path is authoritative. Do not invent any additional runs.",
    "- Lights must sit on the lower front-facing fascia or eave line under the roof edge, not on the top roof ridges, hips, or valleys.",
    "- Never trace the peak lines on top of the roof unless that exact top line is explicitly marked in red.",
    "- If a segment is not clearly marked, leave it unlit rather than guessing.",
    "- Do not place lights as one continuous strip or neon line.",
    "- Show individual permanent bulbs or pucks spaced about 8 inches apart.",
    "- Each bulb should have a subtle downward-facing glow or wall wash, not a thick glowing rope.",
    "",
    "Output requirements:",
    "- Convert the scene into a realistic dusk/night exterior preview.",
    "- Keep the home recognizable and preserve the architecture and landscaping.",
    "- Apply permanent lights only along the intended marked path.",
    "- Lights should feel premium, evenly spaced, and built into the home rather than temporary string lights or LED strips.",
    `- Lighting preset: ${preset.effect}`,
    `- Quality mode: ${quality.promptNote}`,
    "- The result should look like a beautiful sales illustration for a homeowner.",
    "- Do not show any red lines, measurement notes, or markup in the final image.",
    "- Do not add decorations or unrelated holiday props.",
    "- Do not outline the upper roof planes.",
    "- Do not create straight artificial light bars where individual bulbs should be visible.",
    "",
    "Style target:",
    "- clean",
    "- upscale",
    "- realistic",
    "- strong curb appeal",
    "- suitable for a sales estimate presentation"
  ].join("\n");
}

async function generateMockup() {
  if (!state.cleanPhotoDataUrl && !state.guidePhotoDataUrl) {
    setStatus("Upload at least the clean photo first.");
    return;
  }

  setStatus("Generating mockup...");
  refs.generateButton.disabled = true;
  refs.generateButton.textContent = "Generating...";

  try {
    const response = await fetch("/api/mockup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildPrompt(),
        cleanPhotoDataUrl: state.cleanPhotoDataUrl,
        guidePhotoDataUrl: state.guidePhotoDataUrl,
        preset: state.selectedPreset,
        qualityMode: state.qualityMode
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Generation failed");
    }

    state.generatedImageDataUrl = result.imageDataUrl;
    setStatus("Mockup generated.");
  } catch (error) {
    setStatus(`Generation failed: ${error.message}`);
  } finally {
    refs.generateButton.disabled = false;
    refs.generateButton.textContent = "Generate AI Mockup";
    render();
  }
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(refs.promptOutput.value);
    setStatus("AI prompt copied.");
  } catch {
    setStatus("Could not copy automatically, but the request text is visible on screen.");
  }
}

function render() {
  [...refs.presetButtons.children].forEach((button, index) => {
    const key = Object.keys(presets)[index];
    button.classList.toggle("is-active", key === state.selectedPreset);
  });
  [...refs.qualityButtons.children].forEach((button, index) => {
    const key = Object.keys(qualityModes)[index];
    button.classList.toggle("is-active", key === state.qualityMode);
  });

  refs.cleanPhotoName.textContent = state.cleanPhotoName || "No clean photo selected";
  refs.guidePhotoName.textContent = state.guidePhotoName || "No guide photo selected";
  refs.presetBadge.textContent = presets[state.selectedPreset].name;
  refs.promptOutput.value = buildPrompt();

  refs.originalPreview.src = state.cleanPhotoDataUrl || state.guidePhotoDataUrl || "";
  refs.generatedPreview.src = state.generatedImageDataUrl || "";

  refs.previewViewport.classList.toggle("has-original", Boolean(refs.originalPreview.src));
  refs.previewViewport.classList.toggle("has-generated", Boolean(state.generatedImageDataUrl));

  refs.stageTitle.textContent = state.cleanPhotoDataUrl || state.guidePhotoDataUrl
    ? `${presets[state.selectedPreset].name} ${qualityModes[state.qualityMode].name} workflow`
    : "Ready for AI image generation";
  refs.stageHeaderStatus.textContent = state.generatedImageDataUrl
    ? "Preview ready below."
    : "Upload photos and choose a preset.";
  refs.requirementText.textContent = "The local server keeps the provider token server-side and sends the image request to the selected AI service.";

  renderCompare();
}

function renderCompare() {
  const split = state.compareSplit;
  refs.generatedPreview.style.clipPath = state.generatedImageDataUrl
    ? `inset(0 ${100 - split}% 0 0)`
    : "none";
  refs.compareDivider.style.left = `${split}%`;
}

function setStatus(message) {
  refs.statusText.textContent = message;
  refs.stageHeaderStatus.textContent = message;
}

async function prepareImageDataUrl(sourceDataUrl) {
  const image = await loadImage(sourceDataUrl);
  const maxWidth = 1400;
  const scale = Math.min(1, maxWidth / image.width);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function loadImage(sourceDataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = sourceDataUrl;
  });
}

boot();
