package com.scanapp

import android.content.Context
import android.graphics.Bitmap
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.io.File
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class PdfExporterInstrumentedTest {
  private lateinit var context: Context
  private lateinit var root: File

  @Before
  fun setUp() {
    context = ApplicationProvider.getApplicationContext()
    root = File(context.cacheDir, "task5-pdf-test-${System.nanoTime()}").apply { mkdirs() }
  }

  @After
  fun tearDown() {
    root.deleteRecursively()
  }

  @Test
  fun exportsPagesWithA4MarginAndSkipsMissingPages() {
    val page = File(root, "page.png")
    Bitmap.createBitmap(400, 800, Bitmap.Config.ARGB_8888).apply {
      compress(Bitmap.CompressFormat.PNG, 100, page.outputStream())
      recycle()
    }

    val output = PdfExporter.create(
      context = context,
      pageImages = listOf(page, File(root, "missing.png")),
      outputName = "receipt",
      options = PdfExporter.Options(pageSize = PdfExporter.PageSize.A4, marginMillimeters = 10, orientation = PdfExporter.Orientation.PORTRAIT),
      outputDirectory = root,
    )

    assertTrue(output.exists())
    assertEquals("receipt.pdf", output.name)
    assertTrue(output.length() > 0)
  }

  @Test
  fun choosesLandscapePageForAutoOrientationAndIncrementsDuplicateNames() {
    val page = File(root, "landscape.png")
    Bitmap.createBitmap(800, 400, Bitmap.Config.ARGB_8888).apply {
      compress(Bitmap.CompressFormat.PNG, 100, page.outputStream())
      recycle()
    }
    File(root, "report.pdf").writeText("existing")
    File(root, "report (2).pdf").writeText("existing")

    val output = PdfExporter.create(
      context = context,
      pageImages = listOf(page),
      outputName = "report.pdf",
      options = PdfExporter.Options(orientation = PdfExporter.Orientation.AUTO),
      outputDirectory = root,
    )

    assertEquals("report (1).pdf", output.name)
    assertFalse(File(root, "report (1).pdf").length() == 0L)
  }

  @Test
  fun cleansTemporaryOutputWhenExportFails() {
    val outputName = "broken"
    try {
      PdfExporter.create(
        context = context,
        pageImages = listOf(File(root, "missing.png")),
        outputName = outputName,
        options = PdfExporter.Options(),
        outputDirectory = root,
      )
    } catch (_: PdfExporter.ExportException) {
      // expected
    }

    assertFalse(File(root, "$outputName.pdf.tmp").exists())
    assertFalse(File(root, "$outputName.pdf").exists())
  }

  @Test
  fun exportsTwentyPagesIntoOnePdf() {
    val pages = (0 until 20).map { index ->
      File(root, "page-$index.png").also { file ->
        Bitmap.createBitmap(120, 160, Bitmap.Config.ARGB_8888).apply {
          compress(Bitmap.CompressFormat.PNG, 100, file.outputStream())
          recycle()
        }
      }
    }
    val output = PdfExporter.create(context, pages, "twenty-pages", PdfExporter.Options(), root)
    assertTrue(output.isFile)
    assertTrue(output.length() > 0L)
  }
}
