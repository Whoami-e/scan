# FairScan segmentation model provenance

| field | value |
| --- | --- |
| version | `v1.2.0` |
| source URL | https://github.com/pynicolas/fairscan-segmentation-model/releases/download/v1.2.0/fairscan-segmentation-model.tflite |
| download date | 2026-09-03 (downloaded and SHA-256 verified for Task 2) |
| SHA-256 | `96e14d7e610dd0c27b768b228fbc553b4ec119ebe68f3a3594029a25400691d2` (release asset verified 2026-09-03) |
| input size | Exact release tensor: `[1, 256, 256, 3]`, `FLOAT32`; FairScan resizes with bilinear interpolation |
| normalization | `NormalizeOp(127.5f, 127.5f)` (maps 0..255 to approximately -1..1) |
| output tensor shape | Exact release tensor: `[1, 256, 256, 1]`, `FLOAT32` probabilities |
| license text | Model repository `LICENSE` at `v1.2.0` (GPL-3.0, blob `f288702d2fa16d3cdf0035b15a9fcbc552cd88e7`); FairScan application code is GPLv3 (`/LICENSE`) |

The model binary is bundled at `android/app/src/main/assets/models/fairscan-document-segmentation.tflite`.
The adjacent `.sha256` manifest is checked before an interpreter is created. The app never
downloads model data at runtime; a missing, malformed, or mismatched asset yields an explicit
availability state and callers must use the OpenCV/fallback path.

The model was added by Task 2 only after its SHA-256 and license were verified.
A missing hash prevents model loading.
