/* eslint-disable no-void */
import React, {useEffect, useRef, useState} from 'react';
import {Alert, Linking, StatusBar} from 'react-native';
import {PaperProvider} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {createEmptyDocument, Document, EnhanceMode, ImageSource, ScanPage} from '../data/models';
import {fileStore} from '../data/fileStore';
import {importDocuments} from '../native/mediaPicker';
import {scannerModule} from '../native/scannerModule';
import CameraScreen from '../screens/CameraScreen';
import CropScreen, {CropCorners} from '../screens/CropScreen';
import EnhanceScreen from '../screens/EnhanceScreen';
import ExportScreen, {PdfOrientation} from '../screens/ExportScreen';
import HomeScreen from '../screens/HomeScreen';
import PagesScreen from '../screens/PagesScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {paperTheme} from '../theme/theme';

type ScreenName = 'home' | 'camera' | 'crop' | 'enhance' | 'pages' | 'export' | 'settings';

export function uniqueDocuments(documents: Document[]): Document[] {
  const seen = new Set<string>();
  return documents.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** 只恢复真正包含页面的扫描工程，避免旧版本遗留空初始化文档。 */
export function documentsWithPages(documents: Document[]): Document[] {
  return documents.filter(item => item.pages.length > 0);
}

function App(): React.JSX.Element {
  const [screen, setScreen] = useState<ScreenName>('home');
  const [document, setDocument] = useState<Document>(() => createEmptyDocument('doc-local', new Date().toISOString()));
  const [otherDocuments, setOtherDocuments] = useState<Document[]>([]);
  const [pdfNames, setPdfNames] = useState<string[]>([]);
  const [lastPdfPath, setLastPdfPath] = useState<string>();
  const [lastPdfDocumentId, setLastPdfDocumentId] = useState<string>();
  const [pendingImagePath, setPendingImagePath] = useState<string>();
  const [pendingQueue, setPendingQueue] = useState<string[]>([]);
  const [pendingCorners, setPendingCorners] = useState<CropCorners>();
  const [pendingCroppedPath, setPendingCroppedPath] = useState<string>();
  const [pendingProcessedPath, setPendingProcessedPath] = useState<string>();
  const [pendingMode, setPendingMode] = useState<EnhanceMode>('original');
  const [pendingRotation, setPendingRotation] = useState(0);
  const [pendingSource, setPendingSource] = useState<ImageSource>('camera');
  const [cameraProcessing, setCameraProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string>();
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const enhanceRequestRef = useRef(0);

  useEffect(() => {
    let active = true;
    void fileStore.loadDocuments().then(values => {
      if (!active) return;
      const parsed = values.map(value => { try { const candidate = JSON.parse(value) as Partial<Document>; return candidate && typeof candidate.id === 'string' && typeof candidate.title === 'string' && Array.isArray(candidate.pages) ? candidate as Document : undefined; } catch { return undefined; } }).filter((value): value is Document => Boolean(value));
      const ordered = documentsWithPages(parsed).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      if (ordered[0]) setDocument(ordered[0]);
      setOtherDocuments(uniqueDocuments(ordered.slice(1)));
      setHydrated(true);
    }).catch(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    void scannerModule.listPdfNames().then(setPdfNames).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hydrated || document.pages.length === 0) return;
    void Promise.all([document, ...otherDocuments].filter(item => item.pages.length > 0).map(item => fileStore.saveDocument(item.id, JSON.stringify(item)))).catch(() => undefined);
  }, [document, otherDocuments, hydrated]);

  function touchDocument(next: Document): void {
    setDocument({...next, updatedAt: new Date().toISOString()});
  }

  function beginScan(): void {
    setCameraError(undefined);
    setPermissionDenied(false);
    setScreen('camera');
  }

  async function openImage(imagePath: string, remaining: string[] = [], source: ImageSource = 'camera'): Promise<void> {
    setPendingImagePath(imagePath);
    setPendingQueue(remaining);
    setPendingCroppedPath(undefined);
    setPendingProcessedPath(undefined);
    setPendingMode('original');
    setPendingCorners(undefined);
    setPendingRotation(0);
    setPendingSource(source);
    setCameraProcessing(false);
    setScreen('crop');
    try {
      const detection = await scannerModule.detectDocumentEdges(imagePath);
      const c = detection.corners;
      setPendingCorners({tl: c.topLeft, tr: c.topRight, br: c.bottomRight, bl: c.bottomLeft});
    } catch {
      // 原生检测失败时，裁剪页继续使用可手动调整的默认角点。
    }
  }

  async function capturePhoto(): Promise<void> {
    if (cameraProcessing) return;
    setCameraProcessing(true);
    setCameraError(undefined);
    try {
      const nativeResult = await scannerModule.capturePhoto();
      if (!nativeResult.imagePath) throw new Error('照片保存失败');
      await openImage(nativeResult.imagePath, [], 'camera');
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      setPermissionDenied(message.includes('permission') || message.includes('权限'));
      setCameraError('相机拍摄失败，请重试或从相册导入');
    }
    setCameraProcessing(false);
  }

  async function importPhotos(): Promise<void> {
    if (cameraProcessing) return;
    setCameraProcessing(true);
    setCameraError(undefined);
    try {
      const result = await importDocuments();
      if (result.error) setCameraError(result.error);
      else if (!result.cancelled && result.imagePaths[0]) {
        await openImage(result.imagePaths[0], result.imagePaths.slice(1), 'gallery');
        return;
      }
    } catch {
      setCameraError('相册导入失败，请重试');
    }
    setCameraProcessing(false);
  }

  async function confirmCrop(corners: CropCorners): Promise<void> {
    if (!pendingImagePath) return;
    setPendingCorners(corners);
    setCameraProcessing(true);
    try {
      const result = await scannerModule.cropAndWarp(pendingImagePath, {
        topLeft: corners.tl,
        topRight: corners.tr,
        bottomRight: corners.br,
        bottomLeft: corners.bl,
      });
      setPendingCroppedPath(result.processedImagePath);
      setPendingProcessedPath(result.processedImagePath);
    } catch {
      setPendingCroppedPath(pendingImagePath);
      setPendingProcessedPath(pendingImagePath);
    }
    setCameraProcessing(false);
    setScreen('enhance');
  }

  async function changeEnhanceMode(mode: EnhanceMode): Promise<void> {
    setPendingMode(mode);
    const sourcePath = pendingCroppedPath ?? pendingProcessedPath ?? pendingImagePath;
    if (!sourcePath) return;
    const requestId = enhanceRequestRef.current + 1;
    enhanceRequestRef.current = requestId;
    try {
      const result = await scannerModule.enhanceImage(sourcePath, mode);
      if (enhanceRequestRef.current === requestId) setPendingProcessedPath(result.processedImagePath);
    } catch {
      if (enhanceRequestRef.current === requestId) {
        setPendingProcessedPath(sourcePath);
        setPendingMode('original');
      }
    }
  }

  async function rotatePendingImage(): Promise<void> {
    const sourcePath = pendingCroppedPath ?? pendingImagePath;
    if (!sourcePath) return;
    const nextRotation = ((pendingRotation + 90) % 360) as 0 | 90 | 180 | 270;
    try {
      const rotated = await scannerModule.rotateImage(sourcePath, 90);
      setPendingCroppedPath(rotated.processedImagePath);
      let processedPath = rotated.processedImagePath;
      if (pendingMode !== 'original') {
        const enhanced = await scannerModule.enhanceImage(rotated.processedImagePath, pendingMode);
        processedPath = enhanced.processedImagePath;
      }
      setPendingProcessedPath(processedPath);
      setPendingRotation(nextRotation);
    } catch {
      // 原生旋转失败时保留当前预览和角度，用户仍可重试。
    }
  }

  async function addPage(mode: EnhanceMode): Promise<void> {
    if (!pendingImagePath) return;
    const pageId = `page-${Date.now()}`;
    let originalPath = pendingImagePath;
    let processedPath = pendingProcessedPath ?? pendingImagePath;
    try {
      await fileStore.createWorkspace(document.id);
      originalPath = await fileStore.savePageImage(document.id, pageId, pendingImagePath, 'original');
      processedPath = await fileStore.savePageImage(document.id, pageId, processedPath, 'processed');
    } catch {
      // 原生沙盒不可用时保留可编辑的原图 URI，后续仍可重试持久化。
    }
    const page: ScanPage = {
      id: pageId,
      originalImagePath: originalPath,
      processedImagePath: processedPath,
      corners: pendingCorners ? {topLeft: pendingCorners.tl, topRight: pendingCorners.tr, bottomRight: pendingCorners.br, bottomLeft: pendingCorners.bl} : undefined,
      rotationDegrees: pendingRotation,
      enhanceMode: mode,
      source: pendingSource,
      createdAt: new Date().toISOString(),
    };
    touchDocument({...document, pages: [...document.pages, page], status: 'draft'});
    setPendingImagePath(undefined);
    setPendingQueue([]);
    if (pendingQueue.length > 0) {
      const [next, ...rest] = pendingQueue;
      void openImage(next, rest, pendingSource);
    } else setScreen('pages');
  }

  function renderScreen(): React.JSX.Element {
    if (screen === 'camera') return <CameraScreen cameraError={cameraError} isProcessing={cameraProcessing} onBack={() => setScreen('home')} onCapture={capturePhoto} onImport={importPhotos} onPermission={() => { setPermissionDenied(true); Alert.alert('需要相机权限', '请在系统设置中允许相机权限后继续。', [{text: '取消', style: 'cancel'}, {text: '打开设置', onPress: () => void Linking.openSettings()}]); }} onFlashToggle={enabled => { void scannerModule.setFlash(enabled).catch(() => undefined); }} permissionDenied={permissionDenied} />;
    if (screen === 'crop') return <CropScreen imagePath={pendingImagePath} initialCorners={pendingCorners} onBack={() => setScreen('camera')} onConfirm={confirmCrop} onRetake={() => setScreen('camera')} />;
    if (screen === 'enhance') return <EnhanceScreen imagePath={pendingProcessedPath ?? pendingImagePath} mode={pendingMode} rotationDegrees={pendingRotation as 0 | 90 | 180 | 270} onBack={() => setScreen('crop')} onModeChange={changeEnhanceMode} onRotate={rotatePendingImage} onRecrop={() => setScreen('crop')} onAddPage={addPage} />;
    if (screen === 'pages') return <PagesScreen documentTitle={document.title} pages={document.pages} onBack={() => setScreen('home')} onContinueScan={beginScan} onImport={importPhotos} onExport={() => setScreen('export')} onRename={title => touchDocument({...document, title})} onDeletePage={id => touchDocument({...document, pages: document.pages.filter(page => page.id !== id)})} onDeleteDocument={() => { void fileStore.deleteWorkspace(document.id).catch(() => undefined); void fileStore.deleteDocument(document.id).catch(() => undefined); setDocument(createEmptyDocument(document.id, new Date().toISOString())); setScreen('home'); }} onReorder={pages => touchDocument({...document, pages})} />;
    if (screen === 'export') return <ExportScreen pageCount={document.pages.length} initialFileName={`${document.title}.pdf`} existingFileNames={pdfNames} onBack={() => setScreen('pages')} onExport={async (name, orientation: PdfOrientation) => { const result = await scannerModule.createPdf(document.pages.map(page => page.processedImagePath ?? page.originalImagePath), name, {pageSize: 'A4', marginMillimeters: 10, orientation}); setLastPdfPath(result.pdfPath); setLastPdfDocumentId(document.id); setPdfNames(prev => prev.includes(name) ? prev : [...prev, name]); touchDocument({...document, pdfPath: result.pdfPath, status: 'exported'}); }} onOpenPreview={() => { const path = document.pdfPath ?? (lastPdfDocumentId === document.id ? lastPdfPath : undefined); if (!path) { Alert.alert('暂无 PDF', '请先导出 PDF 后再打开预览。'); return; } void scannerModule.openFile(path).catch(() => Alert.alert('无法打开预览', '设备上没有可用的 PDF 阅读器，请稍后重试。')); }} onShare={() => { const path = document.pdfPath ?? (lastPdfDocumentId === document.id ? lastPdfPath : undefined); if (!path) { Alert.alert('暂无 PDF', '请先导出 PDF 后再分享。'); return; } void scannerModule.shareFile(path).catch(() => Alert.alert('分享失败', 'PDF 已保存在 App 沙盒中，你可以稍后重试分享。')); }} />;
    if (screen === 'settings') return <SettingsScreen onBack={() => setScreen('home')} onExportLogs={() => void scannerModule.exportLogs().catch(() => Alert.alert('导出失败', '日志导出失败，请重试。'))} />;
    const homeDocuments = documentsWithPages(uniqueDocuments([document, ...otherDocuments])).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return <HomeScreen documents={homeDocuments} onStartScan={beginScan} onSettings={() => setScreen('settings')} onOpenDocument={doc => { setOtherDocuments(prev => uniqueDocuments([document, ...prev.filter(item => item.id !== doc.id && item.id !== document.id)]).filter(item => item.pages.length > 0)); setDocument(doc); setScreen('pages'); }} onDeleteDocument={doc => { void fileStore.deleteWorkspace(doc.id).catch(() => undefined); void fileStore.deleteDocument(doc.id).catch(() => undefined); if (doc.id === document.id) { setDocument(createEmptyDocument(doc.id, new Date().toISOString())); setScreen('home'); } else setOtherDocuments(prev => prev.filter(item => item.id !== doc.id)); }} />;
  }

  return <SafeAreaProvider><PaperProvider theme={paperTheme}><StatusBar barStyle={screen === 'camera' || screen === 'crop' || screen === 'enhance' ? 'light-content' : 'dark-content'} />{renderScreen()}</PaperProvider></SafeAreaProvider>;
}

export default App;
