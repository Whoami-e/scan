package com.scanapp.fairscan.segmentation

import java.io.File
import kotlin.io.path.createTempDirectory
import java.security.MessageDigest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ModelManifestTest {
  private val assetsDirectory = File("src/main/assets/models")
  private val modelFile = File(assetsDirectory, "fairscan-document-segmentation.tflite")
  private val manifestFile = File(assetsDirectory, "fairscan-document-segmentation.tflite.sha256")

  @Test
  fun bundledModelMatchesTheSha256Manifest() {
    assertTrue("model asset must exist", modelFile.isFile)
    assertTrue("model hash manifest must exist", manifestFile.isFile)

    val expected = manifestFile.readText().trim().substringBefore(' ').lowercase()
    assertTrue("manifest must contain one SHA-256 digest", expected.matches(Regex("[0-9a-f]{64}")))
    assertEquals(expected, sha256(modelFile))
    assertEquals(SegmentationAvailability.READY, FairScanSegmentationService.verifyAssetFiles(modelFile, manifestFile))
  }

  @Test
  fun missingModelAssetIsReportedWithoutThrowing() {
    assertEquals(
      SegmentationAvailability.ASSET_MISSING,
      FairScanSegmentationService.verifyAssetFiles(
        File(assetsDirectory, "not-present.tflite"),
        File(assetsDirectory, "not-present.tflite.sha256"),
      ),
    )
  }

  @Test
  fun malformedManifestIsRejectedWithoutCreatingAnInterpreter() {
    val directory = createTempDirectory("fairscan-model-test").toFile()
    try {
      val model = File(directory, "model.tflite").apply { writeBytes(byteArrayOf(1, 2, 3)) }
      val manifest = File(directory, "model.tflite.sha256").apply { writeText("not-a-sha256\n") }
      assertEquals(SegmentationAvailability.HASH_MISMATCH, FairScanSegmentationService.verifyAssetFiles(model, manifest))
    } finally {
      directory.deleteRecursively()
    }
  }

  private fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
      val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
      while (true) {
        val bytesRead = input.read(buffer)
        if (bytesRead < 0) break
        digest.update(buffer, 0, bytesRead)
      }
    }
    return digest.digest().joinToString("") { byte -> "%02x".format(byte) }
  }
}
