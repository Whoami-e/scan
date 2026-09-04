package com.scanapp

import android.content.Context
import android.graphics.Bitmap
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream

/** Owns the on-device workspace for editable scan documents. */
class ScanFileStore(private val context: Context) {
  companion object {
    @JvmStatic
    fun writeAtomicallyForTest(destination: File, action: (File) -> Unit) {
      val temporary = File(destination.parentFile, ".${destination.name}.${System.nanoTime()}.tmp")
      temporary.parentFile?.mkdirs()
      try {
        action(temporary)
        if (!temporary.renameTo(destination)) throw IllegalStateException("文件替换失败")
      } catch (error: Throwable) {
        temporary.delete()
        throw error
      }
    }

    @JvmStatic
    fun isWithin(root: File, candidate: File): Boolean {
      val rootPath = root.canonicalFile.path
      val candidatePath = candidate.canonicalFile.path
      return candidatePath.startsWith("$rootPath${File.separator}")
    }

    @JvmStatic
    fun isWithinAppSandbox(filesRoot: File, cacheRoot: File, candidate: File): Boolean =
      isWithin(filesRoot, candidate) || isWithin(cacheRoot, candidate)
  }
  fun createWorkspace(documentId: String): File = workspace(documentId).apply { mkdirs() }

  fun savePageImage(documentId: String, pageId: String, source: Uri, kind: String): Uri {
    val destination = pageFile(documentId, pageId, kind)
    val sourcePath = source.path
    if (source.scheme == "content") {
      writeAtomically(destination) { output ->
        context.contentResolver.openInputStream(source)?.use { input -> input.copyTo(output) }
          ?: throw IllegalArgumentException("图片无法读取")
      }
    } else {
      val sourceFile = File(sourcePath ?: source.toString())
      writeAtomically(destination) { output -> sourceFile.inputStream().use { input -> input.copyTo(output) } }
    }
    return Uri.fromFile(destination)
  }

  fun savePageImage(documentId: String, pageId: String, source: String, kind: String): Uri =
    savePageImage(documentId, pageId, Uri.parse(source), kind)

  fun savePageImage(documentId: String, pageId: String, source: Bitmap, kind: String): Uri {
    val destination = pageFile(documentId, pageId, kind)
    writeAtomically(destination) { output -> check(source.compress(Bitmap.CompressFormat.JPEG, 92, output)) { "图片保存失败" } }
    return Uri.fromFile(destination)
  }

  /** Replaces a derived artifact only after the complete temporary file is valid. */
  fun saveRenderedPage(documentId: String, pageId: String, source: Bitmap): Uri =
    savePageImage(documentId, pageId, source, "processed")

  fun writeBitmapAtomically(destination: File, source: Bitmap) {
    writeAtomically(destination) { output ->
      check(source.compress(Bitmap.CompressFormat.JPEG, 92, output)) { "图片保存失败" }
    }
  }

  private fun pageFile(documentId: String, pageId: String, kind: String): File {
    val suffix = when (kind) {
      "thumbnail" -> "thumbnail"
      "processed", "working" -> "working"
      else -> "original"
    }
    return File(createWorkspace(documentId), "${safeSegment(pageId)}-$suffix.jpg")
  }

  private fun writeAtomically(destination: File, writer: (OutputStream) -> Unit) {
    val temporary = File(destination.parentFile, ".${destination.name}.${System.nanoTime()}.tmp")
    temporary.parentFile?.mkdirs()
    try {
      FileOutputStream(temporary).use(writer)
      if (!temporary.renameTo(destination)) {
        throw IllegalStateException("文件替换失败")
      }
    } catch (error: Throwable) {
      temporary.delete()
      throw error
    }
  }

  fun deleteWorkspace(documentId: String) {
    workspace(documentId).deleteRecursively()
  }

  private fun workspace(documentId: String): File = File(context.filesDir, "scan/${safeSegment(documentId)}")

  private fun safeSegment(value: String): String = value.replace(Regex("[^a-zA-Z0-9._-]"), "_").take(96).ifEmpty { "document" }
}
