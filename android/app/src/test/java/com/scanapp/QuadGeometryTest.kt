package com.scanapp

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QuadGeometryTest {
  @Test
  fun normalizedTrapezoidIsValid() {
    assertTrue(isValid(quad(0.12, 0.10, 0.88, 0.08, 0.93, 0.90, 0.08, 0.92)))
  }

  @Test
  fun repeatedPointIsInvalid() {
    assertFalse(isValid(quad(0.10, 0.10, 0.90, 0.10, 0.90, 0.90, 0.90, 0.90)))
  }

  @Test
  fun counterClockwiseOrderIsInvalid() {
    assertFalse(isValid(quad(0.10, 0.10, 0.10, 0.90, 0.90, 0.90, 0.90, 0.10)))
  }

  @Test
  fun selfIntersectingQuadIsInvalid() {
    assertFalse(isValid(quad(0.10, 0.10, 0.90, 0.90, 0.90, 0.10, 0.10, 0.90)))
  }

  @Test
  fun tinyAreaQuadIsInvalid() {
    assertFalse(isValid(quad(0.50, 0.50, 0.51, 0.50, 0.51, 0.51, 0.50, 0.51)))
  }

  @Test
  fun nonFiniteCoordinateIsInvalid() {
    assertFalse(isValid(quad(Double.NaN, 0.10, 0.90, 0.10, 0.90, 0.90, 0.10, 0.90)))
  }

  private fun quad(vararg values: Double): Any {
    require(values.size == 8)
    val pointClass = Class.forName("com.scanapp.ScanPoint")
    val quadClass = Class.forName("com.scanapp.ScanQuad")
    val pointConstructor = pointClass.getConstructor(Double::class.java, Double::class.java)
    val points = (0 until 4).map { index ->
      pointConstructor.newInstance(values[index * 2], values[index * 2 + 1])
    }
    return quadClass.getConstructor(pointClass, pointClass, pointClass, pointClass)
      .newInstance(points[0], points[1], points[2], points[3])
  }

  private fun isValid(quad: Any): Boolean {
    val geometryClass = Class.forName("com.scanapp.QuadGeometry")
    val instance = geometryClass.getField("INSTANCE").get(null)
    return geometryClass.getMethod("isValidNormalizedQuad", Class.forName("com.scanapp.ScanQuad"))
      .invoke(instance, quad) as Boolean
  }
}
