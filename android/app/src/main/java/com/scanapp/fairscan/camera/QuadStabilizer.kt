/*
 * Copyright 2025-2026 The FairScan authors
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 */
// Upstream: FairScan v2.2.0 (2297341), original path: app/src/main/java/org/fairscan/app/ui/screens/camera/QuadStabilizer.kt.
// Local changes: normalized ScanQuad API, timestamp window, reset lifecycle, and finite geometry validation.
package com.scanapp.fairscan.camera

import com.scanapp.QuadGeometry
import com.scanapp.ScanPoint
import com.scanapp.ScanQuad
import kotlin.math.hypot

class QuadStabilizer(
  private val requiredSamples: Int = 3,
  private val maxCornerMovement: Double = 0.05,
  private val maxWindowNanos: Long = 1_000_000_000L,
) {
  init {
    require(requiredSamples > 0) { "requiredSamples must be positive" }
    require(maxCornerMovement > 0.0 && maxCornerMovement.isFinite()) { "maxCornerMovement must be finite and positive" }
    require(maxWindowNanos > 0L) { "maxWindowNanos must be positive" }
  }

  private val samples = ArrayDeque<Pair<ScanQuad, Long>>()

  @Synchronized
  fun offer(quad: ScanQuad?, timestampNanos: Long): ScanQuad? {
    if (quad == null || !QuadGeometry.isValidNormalizedQuad(quad)) { reset(); return null }
    if (samples.lastOrNull()?.second?.let { timestampNanos < it } == true) reset()
    while (samples.isNotEmpty() && timestampNanos - samples.first().second > maxWindowNanos) samples.removeFirst()
    if (samples.lastOrNull()?.first?.let { distance(it, quad) > maxCornerMovement } == true) samples.clear()
    samples.addLast(quad to timestampNanos)
    while (samples.size > requiredSamples) samples.removeFirst()
    if (samples.size < requiredSamples) return null
    val recent = samples.map { it.first }
    val stable = average(recent)
    if (!QuadGeometry.isValidNormalizedQuad(stable)) {
      samples.clear()
      return null
    }
    return stable
  }

  @Synchronized fun reset() { samples.clear() }

  private fun distance(a: ScanQuad, b: ScanQuad): Double = points(a).zip(points(b)).maxOf { (x, y) -> hypot(x.x - y.x, x.y - y.y) }
  private fun average(values: List<ScanQuad>): ScanQuad = ScanQuad(
    avg(values) { it.topLeft }, avg(values) { it.topRight }, avg(values) { it.bottomRight }, avg(values) { it.bottomLeft },
  )
  private fun avg(values: List<ScanQuad>, select: (ScanQuad) -> ScanPoint) = ScanPoint(values.map { select(it).x }.average(), values.map { select(it).y }.average())
  private fun points(q: ScanQuad) = listOf(q.topLeft, q.topRight, q.bottomRight, q.bottomLeft)
}
