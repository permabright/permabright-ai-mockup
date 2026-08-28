const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 4174;
const ROOT = __dirname;
const DEFAULT_REPLICATE_MODEL = process.env.REPLICATE_MODEL || "black-forest-labs/flux-2-pro";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

loadDotEnv();

// In-memory job store — keeps results for 15 minutes
const jobs = new Map();
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < cutoff) jobs.delete(id);
  }
}, 5 * 60 * 1000);

function makeJobId() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

http.createServer((request, response) => {
  if (request.method === "POST" && request.url === "/api/mockup") {
    collectJson(request)
      .then((body) => {
        const jobId = makeJobId();
        jobs.set(jobId, { status: "pending", createdAt: Date.now() });
        // Start generation without blocking the response
        generateMockup(body)
          .then((result) => jobs.set(jobId, { status: "done", result, createdAt: Date.now() }))
          .catch((err) => jobs.set(jobId, { status: "failed", error: err.message || "Server error", createdAt: Date.now() }));
        // Respond immediately with the job ID
        response.writeHead(202, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ jobId }));
      })
      .catch((error) => {
        response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: error.message || "Server error" }));
      });
    return;
  }

  if (request.method === "GET" && request.url.startsWith("/api/mockup-status")) {
    const id = new URL(request.url, "http://x").searchParams.get("id");
    const job = jobs.get(id);
    if (!job) {
      response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ error: "Job not found" }));
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    if (job.status === "done") {
      response.end(JSON.stringify({ status: "done", imageDataUrl: job.result.imageDataUrl }));
    } else if (job.status === "failed") {
      response.end(JSON.stringify({ status: "failed", error: job.error }));
    } else {
      response.end(JSON.stringify({ status: "pending" }));
    }
    return;
  }

  const requestPath = request.url === "/" ? "/index.html" : request.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, { "Content-Type": MIME_TYPES[extension] || "application/octet-stream" });
    response.end(content);
  });
}).listen(PORT, () => {
  console.log(`Permabright web app running at http://localhost:${PORT}`);
});

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function collectJson(request) {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 25 * 1024 * 1024) {
        reject(new Error("Request too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

async function detectRooflineWithAI(body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for roofline detection.");

  const prompt = [
    "You are analyzing a house photo to find EAVE LINES for permanent LED lighting installation.",
    "",
    "WHAT TO TRACE: The bottom edge of the roof overhang — the line where the roof soffit/fascia meets the air above the walls. This is a horizontal or angled line that runs along the FRONT FACE of the house, typically partway up the image.",
    "",
    "WHAT NOT TO TRACE:",
    "- DO NOT trace the roof ridge or peak (the topmost line at the very top of the roof — that is NOT where lights go)",
    "- DO NOT place ANY points in the sky or above the roof surface",
    "- DO NOT trace gutters, windows, walls, or decorative trim",
    "- The eave/fascia line is always BELOW the roofline silhouette against the sky",
    "",
    "SPATIAL GUIDANCE:",
    "- Eave lines are typically in the y=0.20 to y=0.60 range (middle portion of the photo, not the very top)",
    "- If the house fills most of the frame, eaves are often around y=0.30 to y=0.55",
    "- Each continuous eave run should be ONE segment with points every 8-12% along it",
    "- A peaked/gabled house has eave lines that go DOWN toward the peak, then back down on the other side",
    "- Flat/hip roof eaves run more horizontally",
    "",
    "Return ONLY valid JSON: {\"segments\": [[{\"x\":0.05,\"y\":0.45},{\"x\":0.25,\"y\":0.42},{\"x\":0.50,\"y\":0.38},{\"x\":0.75,\"y\":0.42},{\"x\":0.95,\"y\":0.45}]]}",
    "x=0 left edge, x=1 right edge, y=0 top, y=1 bottom. Include 1-6 segments covering all visible eave runs on the front of the house."
  ].join("\n");

  const result = await requestJson({
    hostname: "api.openai.com",
    path: "/v1/chat/completions",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: {
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: body.photoDataUrl, detail: "high" } }
        ]
      }],
      response_format: { type: "json_object" },
      max_tokens: 2000
    }
  });

  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI.");
  let parsed;
  try { parsed = JSON.parse(content); } catch { throw new Error("OpenAI returned invalid JSON."); }
  if (!Array.isArray(parsed.segments)) throw new Error("OpenAI response missing segments array.");

  // Filter obviously-wrong points (sky or off-image)
  const cleaned = parsed.segments
    .map(seg => seg.filter(pt =>
      typeof pt.x === "number" && typeof pt.y === "number" &&
      pt.x >= 0 && pt.x <= 1 && pt.y >= 0.1 && pt.y <= 0.95
    ))
    .filter(seg => seg.length >= 2);

  return { segments: cleaned };
}

async function generateMockup(body) {
  if (process.env.REPLICATE_API_TOKEN) {
    return generateWithReplicate(body, process.env.REPLICATE_API_TOKEN);
  }

  if (process.env.OPENAI_API_KEY) {
    return generateWithOpenAI(body, process.env.OPENAI_API_KEY);
  }

  throw new Error("No provider token found. Add REPLICATE_API_TOKEN or OPENAI_API_KEY.");
}

async function generateWithOpenAI(body, apiKey) {
  const inputs = buildInputImages(body);
  const payload = {
    model: "gpt-4.1",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: body.prompt || "" },
          ...inputs
        ]
      }
    ],
    tools: [
      {
        type: "image_generation",
        size: "1536x1024",
        quality: "high"
      }
    ],
    tool_choice: { type: "image_generation" }
  };

  const result = await requestJson({
    hostname: "api.openai.com",
    path: "/v1/responses",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: payload
  });

  const outputs = Array.isArray(result.output) ? result.output : [];
  const imageCall = outputs.find((item) => item.type === "image_generation_call" && item.result);
  if (!imageCall) {
    throw new Error("OpenAI returned no generated image.");
  }

  return {
    imageDataUrl: `data:image/png;base64,${imageCall.result}`
  };
}

async function generateWithReplicate(body, token) {
  const selectedModel = selectReplicateModel(body.qualityMode);
  const imageUrls = buildInputImages(body).map((item) => item.image_url);
  const payload = {
    input: {
      prompt: body.prompt || "",
      input_images: imageUrls,
      aspect_ratio: "match_input_image",
      resolution: "match_input_image",
      safety_tolerance: 2,
      output_format: "jpg",
      output_quality: 90
    }
  };

  let prediction = await requestJson({
    hostname: "api.replicate.com",
    path: `/v1/models/${selectedModel}/predictions`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Prefer: "wait=60"
    },
    body: payload
  });

  if (prediction.status === "starting" || prediction.status === "processing") {
    prediction = await pollReplicatePrediction(prediction.urls?.get, token);
  }

  if (prediction.status === "failed") {
    console.error("Replicate prediction failed:", JSON.stringify(prediction));
    throw new Error(prediction.error || "Replicate prediction failed.");
  }

  const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!output) {
    throw new Error("Replicate returned no image.");
  }

  const imageBuffer = await downloadBuffer(output, {
    Authorization: `Bearer ${token}`
  });

  return {
    imageDataUrl: `data:image/jpeg;base64,${imageBuffer.toString("base64")}`
  };
}

function selectReplicateModel(qualityMode) {
  if (process.env.REPLICATE_MODEL) {
    return process.env.REPLICATE_MODEL;
  }

  return qualityMode === "draft"
    ? "black-forest-labs/flux-2-dev"
    : DEFAULT_REPLICATE_MODEL;
}

function buildInputImages(body) {
  const inputs = [];
  if (body.cleanPhotoDataUrl) {
    inputs.push({ type: "input_image", image_url: body.cleanPhotoDataUrl });
  }
  if (body.guidePhotoDataUrl) {
    inputs.push({ type: "input_image", image_url: body.guidePhotoDataUrl });
  }
  if (!inputs.length) {
    throw new Error("At least one image is required.");
  }
  return inputs;
}

async function pollReplicatePrediction(getUrl, token) {
  if (!getUrl) {
    throw new Error("Replicate did not provide a polling URL.");
  }

  const url = new URL(getUrl);
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await sleep(2000);
    const prediction = await requestJson({
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (["succeeded", "failed", "canceled"].includes(prediction.status)) {
      return prediction;
    }
  }

  throw new Error("Replicate timed out waiting for the mockup.");
}

function downloadBuffer(urlString, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const request = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Image download failed with status ${response.statusCode}`));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
}

function requestJson({ hostname, path: requestPath, method, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname,
      path: requestPath,
      method,
      headers: {
        ...headers
      }
    };

    if (data) {
      options.headers["Content-Length"] = Buffer.byteLength(data);
    }

    const request = https.request(options, (response) => {
      let raw = "";
      response.on("data", (chunk) => {
        raw += chunk;
      });
      response.on("end", () => {
        let parsed = {};
        try {
          parsed = raw ? JSON.parse(raw) : {};
        } catch (error) {
          reject(new Error(raw || "Provider returned invalid JSON."));
          return;
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          console.error(`Provider error from ${hostname}${requestPath} (status ${response.statusCode}):`, raw);
          reject(new Error(parsed?.error?.message || parsed?.detail || parsed?.error || `Request failed with status ${response.statusCode}`));
          return;
        }

        resolve(parsed);
      });
    });

    request.on("error", reject);
    if (data) {
      request.write(data);
    }
    request.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
