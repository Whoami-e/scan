/*
 * Copyright 2025-2026 The FairScan authors
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <https://www.gnu.org/licenses/>.
 */
// Upstream: FairScan v2.2.0 (2297341), original path: imageprocessing/src/main/java/org/fairscan/imageprocessing/quad/QuadScore.kt.
// Local changes: package namespace; explicit OpenCV resource cleanup; zero-area score guard.
package com.scanapp.fairscan.imageprocessing.quad

import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfPoint
import org.opencv.core.Point
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc

// Fill polygon and return binary mask (0/1)
fun makePolygonMask(size: Size, polygon: List<Point>): Mat {
    val mask = Mat.zeros(size, CvType.CV_8U)
    val pts = MatOfPoint(*polygon.toTypedArray())
    try {
        Imgproc.fillPoly(mask, listOf(pts), Scalar(1.0))
    } finally {
        pts.release()
    }
    return mask
}

// Compute score between quad and probmap
fun scoreQuadAgainstProbmap(quad: List<Point>, probmap: Mat, minQuadAreaRatio: Double): Double {
    val mask = makePolygonMask(probmap.size(), quad)
    val maskFloat = Mat()
    mask.convertTo(maskFloat, CvType.CV_32F)
    val masked = Mat()
    return try {
        Core.multiply(probmap, maskFloat, masked)
        val maskSum = Core.sumElems(maskFloat).`val`[0]
        if (maskSum <= 0.0) return 0.0
        val meanProb = Core.sumElems(masked).`val`[0] / maskSum
        val areaRatio = maskSum / (probmap.rows() * probmap.cols())
        if (areaRatio < minQuadAreaRatio) 0.0 else meanProb * (0.7 + 0.3 * areaRatio)
    } finally {
        masked.release()
        maskFloat.release()
        mask.release()
    }
}
