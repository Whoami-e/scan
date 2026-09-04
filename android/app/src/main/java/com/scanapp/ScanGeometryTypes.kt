package com.scanapp

/** A point whose coordinates are normalized to the source image. */
data class ScanPoint(val x: Double, val y: Double)

/** Document corners in clockwise TL/TR/BR/BL order. */
data class ScanQuad(
  val topLeft: ScanPoint,
  val topRight: ScanPoint,
  val bottomRight: ScanPoint,
  val bottomLeft: ScanPoint,
)

/** Analysis intent shared by still-image and Camera2 callers. */
enum class AnalysisMode {
  CAPTURE,
  IMPORT,
  LIVE_ANALYSIS,
}

fun AnalysisMode.toFairScanMode(): com.scanapp.fairscan.imageprocessing.Mode = when (this) {
  AnalysisMode.CAPTURE -> com.scanapp.fairscan.imageprocessing.Mode.CAPTURE
  AnalysisMode.IMPORT -> com.scanapp.fairscan.imageprocessing.Mode.IMPORT
  AnalysisMode.LIVE_ANALYSIS -> com.scanapp.fairscan.imageprocessing.Mode.LIVE_ANALYSIS
}
