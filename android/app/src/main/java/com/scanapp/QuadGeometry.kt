package com.scanapp

/** Geometry checks shared by detection, cropping, and future manual editing. */
object QuadGeometry {
  const val NORMALIZED_TOLERANCE = 0.02
  const val MIN_NORMALIZED_AREA = 0.01
  private const val CROSS_EPSILON = 1.0e-9

  fun isValidNormalizedQuad(quad: ScanQuad): Boolean {
    val points = listOf(quad.topLeft, quad.topRight, quad.bottomRight, quad.bottomLeft)
    if (points.any { point -> !point.x.isFinite() || !point.y.isFinite() }) return false
    if (points.any { point ->
        point.x < -NORMALIZED_TOLERANCE || point.x > 1.0 + NORMALIZED_TOLERANCE ||
          point.y < -NORMALIZED_TOLERANCE || point.y > 1.0 + NORMALIZED_TOLERANCE
      }) return false

    val signedArea = signedArea(points)
    if (signedArea < MIN_NORMALIZED_AREA) return false

    for (index in points.indices) {
      val a = points[index]
      val b = points[(index + 1) % points.size]
      val c = points[(index + 2) % points.size]
      if (cross(a, b, c) <= CROSS_EPSILON) return false
    }
    return true
  }

  private fun signedArea(points: List<ScanPoint>): Double {
    return points.indices.sumOf { index ->
      val current = points[index]
      val next = points[(index + 1) % points.size]
      current.x * next.y - current.y * next.x
    } / 2.0
  }

  private fun cross(a: ScanPoint, b: ScanPoint, c: ScanPoint): Double {
    return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
  }
}
