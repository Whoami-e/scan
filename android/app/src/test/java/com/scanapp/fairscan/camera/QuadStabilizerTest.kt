package com.scanapp.fairscan.camera

import com.scanapp.ScanPoint
import com.scanapp.ScanQuad
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class QuadStabilizerTest {
  private val q = ScanQuad(ScanPoint(.1,.1), ScanPoint(.9,.1), ScanPoint(.9,.9), ScanPoint(.1,.9))
  @Test fun stableAfterThreeSamples() { val s=QuadStabilizer(); assertNull(s.offer(q,0)); assertNull(s.offer(q,1)); assertNotNull(s.offer(q,2)) }
  @Test fun nullResetsCandidate() { val s=QuadStabilizer(); s.offer(q,0); assertNull(s.offer(null,1)); assertNull(s.offer(q,2)) }
  @Test fun movementBreaksWindow() { val s=QuadStabilizer(); s.offer(q,0); val moved=q.copy(topLeft=ScanPoint(.3,.3)); assertNull(s.offer(moved,1)) }
  @Test fun rejectsNonFiniteAndSelfIntersectingQuads() {
    val s = QuadStabilizer()
    val nan = q.copy(topLeft = ScanPoint(Double.NaN, .1))
    val crossed = ScanQuad(
      ScanPoint(.1, .1), ScanPoint(.9, .9), ScanPoint(.9, .1), ScanPoint(.1, .9),
    )
    assertNull(s.offer(nan, 0))
    assertNull(s.offer(crossed, 1))
    assertNull(s.offer(q, 2))
  }

  @Test fun timestampRollbackResetsCandidate() {
    val s = QuadStabilizer()
    s.offer(q, 100)
    s.offer(q, 101)
    assertNull(s.offer(q, 50))
  }

  @Test fun rejectsInvalidConfiguration() {
    assertThrows(IllegalArgumentException::class.java) { QuadStabilizer(requiredSamples = 0) }
    assertThrows(IllegalArgumentException::class.java) { QuadStabilizer(maxCornerMovement = 0.0) }
    assertThrows(IllegalArgumentException::class.java) { QuadStabilizer(maxWindowNanos = 0L) }
  }
}
