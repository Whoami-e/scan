package com.scanapp

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ScanRecipeRegenerationInstrumentedTest {
  private lateinit var root: File

  @Before
  fun setUp() {
    root = File(ApplicationProvider.getApplicationContext<Context>().cacheDir, "recipe-${System.nanoTime()}").apply { mkdirs() }
  }

  @Test
  fun failedAtomicReplacementKeepsPreviousDerivedFile() {
    val destination = File(root, "working.jpg").apply { writeText("old") }
    try {
      ScanFileStore.writeAtomicallyForTest(destination) { _ -> throw IllegalStateException("injected") }
    } catch (_: IllegalStateException) {
      // expected failure
    }
    assertTrue(destination.isFile)
    assertEquals("old", destination.readText())
    assertTrue(root.listFiles()?.none { it.name.endsWith(".tmp") } == true)
  }

  @Test
  fun successfulAtomicReplacementPublishesNewContent() {
    val destination = File(root, "working-success.jpg").apply { writeText("old") }
    ScanFileStore.writeAtomicallyForTest(destination) { temporary -> temporary.writeText("new") }
    assertEquals("new", destination.readText())
    assertTrue(root.listFiles()?.none { it.name.endsWith(".tmp") } == true)
  }

  @Test
  fun derivedOutputPathMustStayInsideAppSandbox() {
    assertTrue(ScanFileStore.isWithin(root, File(root, "working.jpg")))
    assertTrue(!ScanFileStore.isWithin(root, File(root.parentFile, "outside.jpg")))
  }

  @Test
  fun filesDirRootIsNotAValidDerivedWorkspace() {
    val filesRoot = ApplicationProvider.getApplicationContext<Context>().filesDir
    assertTrue(!ScanFileStore.isWithin(filesRoot, filesRoot))
  }
}
