package com.scanapp

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import java.io.File
import java.io.IOException
import kotlin.math.min

/** Creates non-searchable PDFs in the app sandbox using Android's PdfDocument. */
object PdfExporter {
  enum class PageSize { A4 }
  enum class Orientation { AUTO, PORTRAIT, LANDSCAPE }

  data class Options(
    val pageSize: PageSize = PageSize.A4,
    val marginMillimeters: Int = 10,
    val orientation: Orientation = Orientation.AUTO,
    val jpegQuality: Int = 92,
  )

  class ExportException(message: String, cause: Throwable? = null) : IOException(message, cause)

  fun create(
    context: Context,
    pageImages: List<File>,
    outputName: String,
    options: Options = Options(),
    outputDirectory: File = context.filesDir,
  ): File {
    val validPages = pageImages.filter { it.isFile && it.length() > 0L }
    if (validPages.isEmpty()) throw ExportException("没有可导出的页面")
    require(options.pageSize == PageSize.A4) { "仅支持 A4" }
    require(options.marginMillimeters in 0..50) { "白边尺寸无效" }
    require(options.jpegQuality in 1..100) { "JPEG quality 无效" }

    outputDirectory.mkdirs()
    val output = nextAvailableFile(outputDirectory, outputName)
    val temporary = File(output.parentFile, "${output.name}.tmp")
    val pdf = PdfDocument()
    try {
      validPages.forEachIndexed { index, imageFile ->
        val bitmap = android.graphics.BitmapFactory.decodeFile(imageFile.absolutePath)
          ?: throw ExportException("页面无法读取")
        try {
          val landscape = when (options.orientation) {
            Orientation.LANDSCAPE -> true
            Orientation.PORTRAIT -> false
            Orientation.AUTO -> bitmap.width > bitmap.height
          }
          val pageWidth = if (landscape) 842 else 595
          val pageHeight = if (landscape) 595 else 842
          val page = pdf.startPage(PdfDocument.PageInfo.Builder(pageWidth, pageHeight, index + 1).create())
          drawPage(page.canvas, bitmap, pageWidth, pageHeight, options.marginMillimeters)
          pdf.finishPage(page)
        } finally {
          bitmap.recycle()
        }
      }
      temporary.outputStream().use { pdf.writeTo(it) }
      if (!temporary.renameTo(output)) {
        temporary.copyTo(output, overwrite = false)
        temporary.delete()
      }
      return output
    } catch (error: Throwable) {
      temporary.delete()
      output.delete()
      if (error is ExportException) throw error
      throw ExportException("PDF 生成失败", error)
    } finally {
      pdf.close()
    }
  }

  private fun drawPage(canvas: Canvas, bitmap: Bitmap, pageWidth: Int, pageHeight: Int, marginMillimeters: Int) {
    val margin = marginMillimeters * 72f / 25.4f
    val available = RectF(margin, margin, pageWidth - margin, pageHeight - margin)
    val scale = min(available.width() / bitmap.width, available.height() / bitmap.height).coerceAtLeast(0f)
    val width = bitmap.width * scale
    val height = bitmap.height * scale
    val destination = RectF((pageWidth - width) / 2f, (pageHeight - height) / 2f, (pageWidth + width) / 2f, (pageHeight + height) / 2f)
    canvas.drawColor(android.graphics.Color.WHITE)
    canvas.drawBitmap(bitmap, null, destination, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
  }

  private fun nextAvailableFile(directory: File, requestedName: String): File {
    val base = sanitizeBaseName(requestedName)
    val first = File(directory, "$base.pdf")
    if (!first.exists()) return first
    var index = 1
    while (File(directory, "$base ($index).pdf").exists()) index++
    return File(directory, "$base ($index).pdf")
  }

  private fun sanitizeBaseName(value: String): String {
    val withoutExtension = value.trim().replace(Regex("(?i)\\.pdf$"), "")
    val sanitized = withoutExtension.replace(Regex("[^a-zA-Z0-9一-龥._ -]"), "_").trim().trim('.')
    return sanitized.take(120).ifEmpty { "scan" }
  }
}
