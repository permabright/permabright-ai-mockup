# Permabright AI Mockup Studio

This is the local web app for the real rep workflow:

- upload the clean front-of-home photo
- optionally upload the red-marked guide photo
- choose a preset like `Accent`, `Warm White`, or `Christmas`
- generate a homeowner-facing night mockup with Permabright lighting

## One-Time Setup

Create a file named `.env` inside this folder:

`C:\Users\peyso\Documents\Codex\2026-04-20-i-want-to-make-an-app\webapp\.env`

Put one of these inside it:

```env
REPLICATE_API_TOKEN=your_replicate_token_here
REPLICATE_MODEL=black-forest-labs/flux-2-dev
```

or

```env
OPENAI_API_KEY=your_new_secret_key_here
```

Do not put quotes around the key.

## Run It

Easiest:

- double-click [Start Permabright App.bat](C:\Users\peyso\Documents\Codex\2026-04-20-i-want-to-make-an-app\webapp\Start Permabright App.bat)

Or from a terminal in this folder:

```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1
```

Then open:

`http://localhost:4174`

## How To Test

1. Upload the clean home photo.
2. Optionally upload the red guide photo.
3. Choose a preset.
4. Click `Generate AI Mockup`.

The browser sends the request to the local server, and the local server calls the configured AI provider using the token from `.env`.

## Current Notes

- Output is designed to default to a night preview.
- The app keeps the original photo visible for comparison.
- The AI prompt is visible on screen so it can be refined if needed.
- Default Replicate model is now the cheaper `black-forest-labs/flux-2-dev`.

## Public URL

This app now includes [render.yaml](C:\Users\peyso\Documents\Codex\2026-04-20-i-want-to-make-an-app\webapp\render.yaml) so it is ready for Render deployment.

Recommended path:

1. Put the `webapp` folder in a GitHub repo.
2. Create a new Render web service from that repo.
3. Set the root directory to `webapp` if needed.
4. Add one secret environment variable in Render:
   - `REPLICATE_API_TOKEN`
5. Deploy and use the public Render URL on iPhone/iPad.
