# FairScan v2.2.0 source manifest

Snapshot: FairScan `v2.2.0`, commit `22973418c50545a5907b44d5329cf38f4398ad5d`.

The algorithm sources under this package preserve the upstream GPLv3 header.
Each file has an `Upstream:` comment immediately after that header. The full
seven-column provenance table, blob IDs, and verification command are in
`docs/third-party/fairscan-sources.md`.

`DocumentDetection.kt` and `quad/QuadScore.kt` additionally release temporary
OpenCV Mats/contours created during adaptive thresholding; this is a local
resource-ownership change required by the Camera2 live-analysis lifecycle.

The `ImageSegmentation.kt` reference snapshot is intentionally stored under
`android/app/src/reference/` and is excluded from the default Android main
source set until Task 2 supplies its LiteRT/coroutines/logger dependencies.

Only document geometry, segmentation reference code, image post-processing and
quad stabilization are included. FairScan UI, CameraX, OCR, PDFBox and model
assets are intentionally excluded.
