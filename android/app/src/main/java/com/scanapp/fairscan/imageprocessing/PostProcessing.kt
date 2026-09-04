/*
 * Copyright 2025-2026 The FairScan authors
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option)
 * any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
 * Public License for more details.
 * You should have received a copy of the GNU General Public License along with
 * this program. If not, see <https://www.gnu.org/licenses/>.
 */
// Upstream: FairScan v2.2.0 (2297341), original path: imageprocessing/src/main/java/org/fairscan/imageprocessing/PostProcessing.kt.
// Local changes: package namespace; Bitmap adapter; bounded processing; standalone black-and-white mode; explicit OpenCV cleanup.
package com.scanapp.fairscan.imageprocessing

import android.graphics.Bitmap
import org.opencv.android.OpenCVLoader
import org.opencv.android.Utils
import org.opencv.core.Core
import org.opencv.core.CvType
import org.opencv.core.Mat
import org.opencv.core.MatOfFloat
import org.opencv.core.MatOfInt
import org.opencv.core.Scalar
import org.opencv.core.Size
import org.opencv.imgproc.Imgproc
import kotlin.math.max
import kotlin.math.min

enum class ColorMode { COLOR, GRAYSCALE }

fun enhanceCapturedImage(img: Mat, colorMode: ColorMode): Mat = when (colorMode) {
  ColorMode.COLOR -> multiScaleRetinexOnL(img)
  ColorMode.GRAYSCALE -> enhanceGrayscaleImage(img)
}

private fun multiScaleRetinexOnL(input: Mat): Mat {
  val lab = Mat(); val channels = ArrayList<Mat>(3)
  val lFloat = Mat(); val lSmall = Mat(); val logLSmall = Mat()
  val blurLog = Mat(); val diff = Mat(); val retinexNormSmall = Mat()
  val retinexNorm = Mat(); val lOriginalFloat = Mat(); val correctedL = Mat()
  try {
    Imgproc.cvtColor(input, lab, Imgproc.COLOR_BGR2Lab)
    Core.split(lab, channels)
    val l = channels[0]
    l.convertTo(lFloat, CvType.CV_32F)
    Core.add(lFloat, Scalar(1.0), lFloat)
    val smallSize = Size(
      (lFloat.cols() / 2.0).coerceAtLeast(1.0),
      (lFloat.rows() / 2.0).coerceAtLeast(1.0),
    )
    Imgproc.resize(lFloat, lSmall, smallSize, 0.0, 0.0, Imgproc.INTER_AREA)
    Core.log(lSmall, logLSmall)
    val kernelSizes = listOf(
      max(smallSize.width, smallSize.height) / 80.0,
      max(smallSize.width, smallSize.height) / 10.0,
      max(smallSize.width, smallSize.height) / 2.0,
    )
    val retinexSmall = Mat.zeros(lSmall.size(), CvType.CV_32F)
    try {
      kernelSizes.forEach { kernelSize ->
        val kernel = kernelSize.toInt().coerceAtLeast(3) or 1
        Imgproc.boxFilter(logLSmall, blurLog, -1, Size(kernel.toDouble(), kernel.toDouble()))
        Core.subtract(logLSmall, blurLog, diff)
        Core.addWeighted(retinexSmall, 1.0, diff, 1.0 / kernelSizes.size, 0.0, retinexSmall)
      }

      val minMax = Core.minMaxLoc(retinexSmall)
      Core.subtract(retinexSmall, Scalar(minMax.minVal), retinexNormSmall)
      val range = minMax.maxVal - minMax.minVal
      if (range > 1e-6) Core.multiply(retinexNormSmall, Scalar(1.0 / range), retinexNormSmall)
      Imgproc.resize(retinexNormSmall, retinexNorm, lFloat.size(), 0.0, 0.0, Imgproc.INTER_CUBIC)

      l.convertTo(lOriginalFloat, CvType.CV_32F)
      val amplitude = 60.0
      Core.multiply(retinexNorm, Scalar(amplitude), correctedL)
      Core.add(correctedL, Scalar(Core.mean(lOriginalFloat).`val`[0] - amplitude / 2.0), correctedL)
      Core.addWeighted(lOriginalFloat, 0.4, correctedL, 0.6, 0.0, correctedL)

      val originalLow = percentileL(lOriginalFloat, 0.001)
      val low = percentileL(correctedL, 0.001)
      val high = percentileL(correctedL, 0.995)
      val targetLow = min(low, originalLow)
      Core.subtract(correctedL, Scalar(low), correctedL)
      Core.multiply(correctedL, Scalar((245.0 - targetLow) / (high - low + 1e-6)), correctedL)
      Core.add(correctedL, Scalar(targetLow), correctedL)
      Core.min(correctedL, Scalar(255.0), correctedL)
      Core.max(correctedL, Scalar(0.0), correctedL)
      correctedL.convertTo(channels[0], CvType.CV_8U)
      Core.merge(channels, lab)
      return Mat().also { Imgproc.cvtColor(lab, it, Imgproc.COLOR_Lab2BGR) }
    } finally {
      retinexSmall.release()
    }
  } finally {
    correctedL.release(); lOriginalFloat.release(); retinexNorm.release(); retinexNormSmall.release()
    diff.release(); blurLog.release(); logLSmall.release(); lSmall.release(); lFloat.release()
    channels.forEach { it.release() }
    lab.release()
  }
}

private fun enhanceGrayscaleImage(input: Mat): Mat {
  val gray = Mat(); val imageFloat = Mat(); val logImage = Mat()
  val blur = Mat(); val logBlur = Mat(); val diff = Mat(); val retinexExp = Mat()
  val flat = Mat(); val sorted = Mat(); val normalized = Mat(); val result8u = Mat()
  val stretched8u = Mat(); val denoised = Mat()
  try {
    when (input.channels()) {
      4 -> Imgproc.cvtColor(input, gray, Imgproc.COLOR_BGRA2GRAY)
      3 -> Imgproc.cvtColor(input, gray, Imgproc.COLOR_BGR2GRAY)
      else -> input.copyTo(gray)
    }
    if (gray.total() < 64) {
      val channels = ArrayList<Mat>(3)
      val blue = Mat(); val green = Mat(); val red = Mat(); val weighted = Mat(); val bgr = Mat()
      try {
        Core.split(input, channels)
        channels[2].convertTo(red, CvType.CV_32F)
        channels[1].convertTo(green, CvType.CV_32F)
        channels[0].convertTo(blue, CvType.CV_32F)
        Core.addWeighted(red, 0.2126, green, 0.7152, 0.0, weighted)
        Core.addWeighted(weighted, 1.0, blue, 0.0722, 0.0, weighted)
        weighted.convertTo(gray, CvType.CV_8U)
        Imgproc.cvtColor(gray, bgr, Imgproc.COLOR_GRAY2BGR)
        return bgr.clone()
      } finally {
        bgr.release(); weighted.release(); red.release(); green.release(); blue.release(); channels.forEach { it.release() }
      }
    }
    gray.convertTo(imageFloat, CvType.CV_32F)
    Core.add(imageFloat, Scalar(1.0), imageFloat)
    Core.log(imageFloat, logImage)
    val kernelSizes = listOf(max(gray.cols(), gray.rows()) / 6.0, max(gray.cols(), gray.rows()) / 50.0)
    val retinex = Mat.zeros(gray.size(), CvType.CV_32F)
    try {
      kernelSizes.forEach { kernelSize ->
        Imgproc.boxFilter(imageFloat, blur, -1, Size(kernelSize.coerceAtLeast(3.0), kernelSize.coerceAtLeast(3.0)))
        Core.add(blur, Scalar(1.0), blur)
        Core.log(blur, logBlur)
        Core.subtract(logImage, logBlur, diff)
        Core.addWeighted(retinex, 1.0, diff, 1.0 / kernelSizes.size, 0.0, retinex)
      }
      Core.exp(retinex, retinexExp)
    } finally {
      retinex.release()
    }

    retinexExp.reshape(1, 1).copyTo(flat)
    Core.sort(flat, sorted, Core.SORT_ASCENDING)
    val count = sorted.cols()
    val low = sorted.get(0, (count * 0.004).toInt().coerceIn(0, count - 1))[0]
    val high = sorted.get(0, (count * 0.99).toInt().coerceIn(0, count - 1))[0]
    Core.subtract(retinexExp, Scalar(low), normalized)
    Core.multiply(normalized, Scalar(if (high > low) 255.0 / (high - low) else 1.0), normalized)
    Core.min(normalized, Scalar(255.0), normalized)
    Core.max(normalized, Scalar(0.0), normalized)
    normalized.convertTo(result8u, CvType.CV_8U)

    val histogram = Mat()
    var modeValue = 220
    try {
      Imgproc.calcHist(listOf(result8u), MatOfInt(0), Mat(), histogram, MatOfInt(256), MatOfFloat(0f, 256f))
      var modeCount = 0.0
      for (i in 180 until 256) {
        val current = histogram.get(i, 0)[0]
        if (current > modeCount) { modeCount = current; modeValue = i }
      }
    } finally {
      histogram.release()
    }
    if (modeValue >= 254) {
      normalizeGrayPercentiles(gray, stretched8u)
    } else {
      val stretchedFloat = Mat()
      try {
        result8u.convertTo(stretchedFloat, CvType.CV_32F)
        Core.multiply(stretchedFloat, Scalar(255.0 / modeValue), stretchedFloat)
        Core.min(stretchedFloat, Scalar(255.0), stretchedFloat)
        stretchedFloat.convertTo(stretched8u, CvType.CV_8U)
      } finally { stretchedFloat.release() }
    }
    Imgproc.bilateralFilter(stretched8u, denoised, 9, 20.0, 10.0)
    return Mat().also { Imgproc.cvtColor(denoised, it, Imgproc.COLOR_GRAY2BGR) }
  } finally {
    denoised.release(); stretched8u.release(); result8u.release(); normalized.release()
    sorted.release(); flat.release(); retinexExp.release(); diff.release(); logBlur.release()
    blur.release(); logImage.release(); imageFloat.release(); gray.release()
  }
}

private fun percentileL(luminance: Mat, percentile: Double): Double {
  val histogram = Mat()
  val mask = Mat()
  val channels = MatOfInt(0)
  val histogramSize = MatOfInt(256)
  val ranges = MatOfFloat(0f, 256f)
  try {
    Imgproc.calcHist(listOf(luminance), channels, mask, histogram, histogramSize, ranges)
    var sum = 0.0
    for (index in 0 until 256) {
      sum += histogram.get(index, 0)[0]
      if (sum / luminance.total() >= percentile) return index.toDouble()
    }
    return 255.0
  } finally {
    ranges.release(); histogramSize.release(); channels.release(); mask.release(); histogram.release()
  }
}

private fun normalizeGrayPercentiles(gray: Mat, output: Mat) {
  val grayFloat = Mat(); val flat = Mat(); val sorted = Mat()
  try {
    gray.convertTo(grayFloat, CvType.CV_32F)
    grayFloat.reshape(1, 1).copyTo(flat)
    Core.sort(flat, sorted, Core.SORT_ASCENDING)
    val count = sorted.cols()
    val low = sorted.get(0, (count * 0.01).toInt().coerceIn(0, count - 1))[0]
    val high = sorted.get(0, (count * 0.99).toInt().coerceIn(0, count - 1))[0]
    Core.subtract(grayFloat, Scalar(low), grayFloat)
    Core.multiply(grayFloat, Scalar(255.0 / (high - low + 1e-6)), grayFloat)
    Core.min(grayFloat, Scalar(255.0), grayFloat)
    Core.max(grayFloat, Scalar(0.0), grayFloat)
    grayFloat.convertTo(output, CvType.CV_8U)
  } finally { sorted.release(); flat.release(); grayFloat.release() }
}

object PostProcessing {
  fun enhanceColorImage(source: Bitmap): Bitmap = processBitmap(source, ColorMode.COLOR)

  fun enhanceGrayImage(source: Bitmap): Bitmap = processBitmap(source, ColorMode.GRAYSCALE)

  fun blackWhite(source: Bitmap): Bitmap {
    ensureOpenCvLoaded()
    val input = Mat()
    val gray = Mat()
    val output = Mat()
    return try {
      Utils.bitmapToMat(source, input)
      Imgproc.cvtColor(input, gray, Imgproc.COLOR_RGBA2GRAY)
      val minimumDimension = minOf(gray.cols(), gray.rows())
      if (minimumDimension < 3) {
        // OpenCV requires an odd block size greater than one. Tiny thumbnails
        // cannot satisfy that contract, so use a deterministic global split.
        Imgproc.threshold(gray, output, 0.0, 255.0, Imgproc.THRESH_BINARY or Imgproc.THRESH_OTSU)
      } else {
        var blockSize = minOf(31, minimumDimension)
        if (blockSize % 2 == 0) blockSize -= 1
        Imgproc.adaptiveThreshold(gray, output, 255.0, Imgproc.ADAPTIVE_THRESH_GAUSSIAN_C, Imgproc.THRESH_BINARY, blockSize.coerceAtLeast(3), 7.0)
      }
      Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888).also { Utils.matToBitmap(output, it) }
    } finally { output.release(); gray.release(); input.release() }
  }

  private fun retinex(source: Bitmap, preserveColor: Boolean): Bitmap {
    ensureOpenCvLoaded()
    val input = Mat(); val lab = Mat(); val l = Mat(); val blur = Mat(); val reflectance = Mat(); val merged = Mat()
    return try {
      Utils.bitmapToMat(source, input)
      if (preserveColor) {
        val rgb = Mat()
        Imgproc.cvtColor(input, rgb, Imgproc.COLOR_RGBA2RGB)
        Imgproc.cvtColor(rgb, lab, Imgproc.COLOR_RGB2Lab)
        rgb.release()
        Core.extractChannel(lab, l, 0)
      } else {
        rgbaToRec709Gray(input, l)
      }
      if (source.width * source.height < 64) {
        // Preserve the exact luminance conversion for tiny thumbnails. The
        // multi-scale normalization below needs spatial context and otherwise
        // amplifies quantization noise into arbitrary levels.
        Imgproc.cvtColor(l, merged, Imgproc.COLOR_GRAY2RGBA)
        return Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888).also { Utils.matToBitmap(merged, it) }
      }
      Imgproc.GaussianBlur(l, blur, Size(0.0, 0.0), 15.0)
      Core.subtract(l, blur, reflectance)
      Core.normalize(reflectance, l, 0.0, 255.0, Core.NORM_MINMAX)
      if (preserveColor) {
        Core.insertChannel(l, lab, 0)
        val rgb = Mat()
        Imgproc.cvtColor(lab, rgb, Imgproc.COLOR_Lab2RGB)
        Imgproc.cvtColor(rgb, merged, Imgproc.COLOR_RGB2RGBA)
        rgb.release()
      } else {
        Imgproc.bilateralFilter(l, merged, 5, 35.0, 35.0)
        Imgproc.cvtColor(merged, merged, Imgproc.COLOR_GRAY2RGBA)
      }
      Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888).also { Utils.matToBitmap(merged, it) }
    } finally { merged.release(); lab.release(); l.release(); blur.release(); reflectance.release(); input.release() }
  }

  private fun processBitmap(source: Bitmap, mode: ColorMode): Bitmap {
    ensureOpenCvLoaded()
    val input = Mat()
    var output: Mat? = null
    return try {
      Utils.bitmapToMat(source, input)
      // Bitmap pixels are RGBA; the FairScan core consumes BGR/BGRA mats.
      val bgr = Mat()
      try {
        Imgproc.cvtColor(input, bgr, Imgproc.COLOR_RGBA2BGR)
        output = enhanceCapturedImage(bgr, mode)
      } finally {
        bgr.release()
      }
      Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888).also {
        val rgba = Mat()
        Imgproc.cvtColor(output, rgba, Imgproc.COLOR_BGR2RGBA)
        Utils.matToBitmap(rgba, it)
        rgba.release()
      }
    } finally {
      output?.release()
      input.release()
    }
  }

  private fun ensureOpenCvLoaded() { if (!OpenCVLoader.initDebug()) System.loadLibrary("opencv_java4") }

  private fun rgbaToRec709Gray(input: Mat, output: Mat) {
    val channels = ArrayList<Mat>(4)
    val red = Mat(); val green = Mat(); val blue = Mat(); val weighted = Mat()
    try {
      Core.split(input, channels)
      channels[0].convertTo(red, org.opencv.core.CvType.CV_32F)
      channels[1].convertTo(green, org.opencv.core.CvType.CV_32F)
      channels[2].convertTo(blue, org.opencv.core.CvType.CV_32F)
      Core.addWeighted(red, 0.2126, green, 0.7152, 0.0, weighted)
      Core.addWeighted(weighted, 1.0, blue, 0.0722, 0.0, weighted)
      weighted.convertTo(output, org.opencv.core.CvType.CV_8U)
    } finally {
      channels.forEach { it.release() }
      blue.release(); green.release(); red.release(); weighted.release()
    }
  }
}
