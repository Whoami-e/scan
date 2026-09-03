package com.scanapp

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import java.io.File

/** Owns the on-device workspace for editable scan documents. */
class ScanFileStore(private val context: Context) {
  fun createWorkspace(documentId: String): File = workspace(documentId).apply { mkdirs() }

  fun savePageImage(documentId: String, pageId: String, source: Uri, kind: String): Uri {
    val destination = File(createWorkspace(documentId), "${safeSegment(pageId)}-${if (kind == "processed") "processed" else "original"}.jpg")
    val sourcePath = source.path
    if (source.scheme == "content") {
      context.contentResolver.openInputStream(source)?.use { input -> destination.outputStream().use { output -> input.copyTo(output) } }
        ?: throw IllegalArgumentException("图片无法读取")
    } else {
      File(sourcePath ?: source.toString()).copyTo(destination, overwrite = true)
    }
    return Uri.fromFile(destination)
  }

  fun savePageImage(documentId: String, pageId: String, source: String, kind: String): Uri =
    savePageImage(documentId, pageId, Uri.parse(source), kind)

  fun savePageImage(documentId: String, pageId: String, source: Bitmap, kind: String): Uri {
    val destination = File(createWorkspace(documentId), "${safeSegment(pageId)}-${if (kind == "processed") "processed" else "original"}.jpg")
    destination.outputStream().use { output ->
      check(source.compress(Bitmap.CompressFormat.JPEG, 92, output)) { "图片保存失败" }
    }
    return Uri.fromFile(destination)
  }

  fun deleteWorkspace(documentId: String) {
    workspace(documentId).deleteRecursively()
  }

  private fun workspace(documentId: String): File = File(context.filesDir, "scan/${safeSegment(documentId)}")

  private fun safeSegment(value: String): String = value.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(96).ifEmpty { "document" }
}
