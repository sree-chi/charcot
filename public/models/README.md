# Face-API.js Model Files

This directory contains the model files for face-api.js emotion detection.

## Download Models

### Windows (PowerShell)
Run the PowerShell script from the project root:
```powershell
.\download-models.ps1
```

### Manual Download
Download the following files from https://github.com/justadudewhohacks/face-api.js/tree/master/weights:

**TinyFaceDetector:**
- `tiny_face_detector_model-weights_manifest.json`
- `tiny_face_detector_model-shard1`

**Face Expression (Emotion) Model:**
- `face_expression_model-weights_manifest.json`
- `face_expression_model-shard1`

Place all files in this `public/models/` directory.

## Fallback Behavior

If models are not found locally, the app will automatically fall back to loading models from CDN:
1. Primary CDN: `https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model`
2. Fallback CDN: `https://justadudewhohacks.github.io/face-api.js/models`

Local models provide better performance and offline capability.

## Detected Emotions

The face-api.js model can detect the following emotions:
- **neutral** - Neutral/calm expression
- **happy** - Smiling, positive expression
- **sad** - Sad, down expression
- **angry** - Angry, hostile expression
- **fearful** - Afraid, fearful expression
- **disgusted** - Disgusted expression
- **surprised** - Surprised expression

The emotion with the highest confidence score is displayed in the "Current Emotion" box.
