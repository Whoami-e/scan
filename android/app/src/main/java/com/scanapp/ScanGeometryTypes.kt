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
