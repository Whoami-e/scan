import React, {useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  StatusBar,
  Text,
  View,
  requireNativeComponent,
} from 'react-native';
import Svg, {Circle, Path, Rect} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {theme} from '../theme/theme';

const NativeCameraPreview = requireNativeComponent<{
  enabled?: boolean;
  flashOn?: boolean;
  accessibilityLabel?: string;
  style?: object;
}>('ScannerCameraView');

export interface CameraScreenProps {
  onBack?: () => void;
  onCapture?: () => void;
  onImport?: () => void;
  onPermission?: () => void;
  onFlashToggle?: (enabled: boolean) => void;
  permissionDenied?: boolean;
  isProcessing?: boolean;
  processingLabel?: string;
  cameraError?: string;
  cameraEnabled?: boolean;
}

function CameraScreen({
  onBack,
  onCapture,
  onImport,
  onPermission,
  onFlashToggle,
  permissionDenied = false,
  isProcessing = false,
  processingLabel = '正在处理照片',
  cameraError,
  cameraEnabled = true,
}: CameraScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [flashOn, setFlashOn] = useState(false);
  const statusLabel = permissionDenied ? '相机权限已拒绝' : cameraError ?? '已检测到文档边缘';

  function toggleFlash(): void {
    const next = !flashOn;
    setFlashOn(next);
    onFlashToggle?.(next);
  }

  function handleCapture(): void {
    if (!isProcessing) onCapture?.();
  }

  function handleImport(): void {
    if (!isProcessing) onImport?.();
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View accessibilityLabel="相机画面区域" style={styles.viewport}>
        <View style={styles.cameraSurface}>
          <NativeCameraPreview
            accessibilityLabel="实时摄像头预览"
            enabled={cameraEnabled && !permissionDenied}
            flashOn={flashOn}
            style={styles.nativePreview}
          />
          <View
            testID="camera-processing-shade"
            style={[styles.previewShade, isProcessing && styles.processingShade]}
          />
          <View style={styles.viewportMessage}>
            {isProcessing ? <ActivityIndicator color={theme.colors.surfaceDefault} size="small" /> : null}
            <Text style={styles.viewportMessageText}>{cameraError ?? (isProcessing ? processingLabel : '请保持纸张完整入镜')}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.header, {paddingTop: insets.top + 10}]}>
        <Pressable
          accessibilityLabel="返回首页"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onBack}
          style={styles.headerIconButton}>
          <BackIcon />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>拍摄文档</Text>
          <Text style={styles.subtitle}>{statusLabel}</Text>
        </View>
        <Pressable
          accessibilityLabel="切换闪光灯"
          accessibilityRole="button"
          accessibilityState={{checked: flashOn}}
          hitSlop={8}
          onPress={toggleFlash}
          style={[styles.headerIconButton, flashOn && styles.headerIconButtonActive]}>
          <FlashIcon active={flashOn} />
        </Pressable>
      </View>

      <View style={[styles.statusArea, {bottom: Math.max(insets.bottom + 132, 150)}]}>
        {permissionDenied ? <Text style={styles.permissionText}>请在系统设置中允许相机权限后继续</Text> : null}
        {cameraError ? <Text style={styles.errorText}>{cameraError}</Text> : null}
      </View>

      <View style={[styles.controls, {bottom: Math.max(insets.bottom + 14, 14), paddingBottom: Math.max(insets.bottom + 14, 26)}]}>
        <Pressable
          accessibilityLabel="从相册导入"
          accessibilityRole="button"
          accessibilityState={{disabled: isProcessing}}
          disabled={isProcessing}
          onPress={handleImport}
          style={styles.sideAction}>
          <View style={styles.sideIcon}><GalleryIcon /></View>
          <Text style={styles.sideLabel}>相册</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="拍照"
          accessibilityRole="button"
          accessibilityState={{busy: isProcessing, disabled: isProcessing}}
          disabled={isProcessing}
          onPress={handleCapture}
          style={({pressed}) => [styles.shutter, pressed && !isProcessing && styles.shutterPressed, isProcessing && styles.shutterDisabled]}>
          {isProcessing ? <ActivityIndicator color={theme.colors.inkPrimary} size="small" /> : <View style={styles.shutterInner} />}
        </Pressable>
        <Pressable
          accessibilityLabel="打开权限设置"
          accessibilityRole="button"
          accessibilityState={{disabled: isProcessing}}
          disabled={isProcessing}
          onPress={onPermission}
          style={styles.sideAction}>
          <View style={styles.sideIcon}><ShieldIcon /></View>
          <Text style={styles.sideLabel}>权限</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BackIcon(): React.JSX.Element {
  return <Svg height={22} viewBox="0 0 24 24" width={22}><Path d="m15 18-6-6 6-6" fill="none" stroke={theme.colors.surfaceDefault} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></Svg>;
}

function FlashIcon({active}: {active: boolean}): React.JSX.Element {
  return <Svg height={22} viewBox="0 0 24 24" width={22}><Path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill={active ? theme.colors.actionPrimary : 'none'} stroke={active ? theme.colors.actionPrimary : theme.colors.surfaceDefault} strokeLinejoin="round" strokeWidth={1.8} /></Svg>;
}

function GalleryIcon(): React.JSX.Element {
  return <Svg height={24} viewBox="0 0 24 24" width={24}><Rect fill="none" height={16} rx={2} stroke={theme.colors.canvasWarm} strokeWidth={1.8} width={18} x={3} y={4} /><Circle cx={8} cy={9} fill={theme.colors.canvasWarm} r={1.5} /><Path d="m5 18 5-5 3 3 2-2 4 4" fill="none" stroke={theme.colors.canvasWarm} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></Svg>;
}

function ShieldIcon(): React.JSX.Element {
  return <Svg height={24} viewBox="0 0 24 24" width={24}><Path d="M12 3 20 6v5c0 5.1-3.2 8.4-8 10-4.8-1.6-8-4.9-8-10V6l8-3Z" fill="none" stroke={theme.colors.canvasWarm} strokeLinejoin="round" strokeWidth={1.8} /><Path d="m8.5 12 2.2 2.2 4.8-5" fill="none" stroke={theme.colors.canvasWarm} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} /></Svg>;
}

const styles = StyleSheet.create({
  screen: {backgroundColor: theme.colors.darkWorkspace, flex: 1},
  header: {alignItems: 'center', flexDirection: 'row', left: 0, minHeight: 72, paddingBottom: 10, paddingHorizontal: 20, position: 'absolute', right: 0, top: 0, zIndex: 4},
  headerIconButton: {alignItems: 'center', backgroundColor: theme.colors.inkSecondary, borderColor: theme.colors.canvasWarm, borderRadius: 14, borderWidth: 2, height: 46, justifyContent: 'center', width: 46},
  headerIconButtonActive: {backgroundColor: theme.colors.inkPrimary, borderColor: theme.colors.actionPrimary},
  headerCopy: {alignItems: 'center', flex: 1, paddingHorizontal: 10},
  title: {color: theme.colors.surfaceDefault, fontSize: 21, fontWeight: '800', lineHeight: 25},
  subtitle: {color: 'rgba(255,255,255,0.68)', fontSize: 13, marginTop: 4},
  viewport: {bottom: 0, left: 0, overflow: 'hidden', position: 'absolute', right: 0, top: 0, zIndex: 0},
  cameraSurface: {backgroundColor: '#211A3D', flex: 1, overflow: 'hidden'},
  nativePreview: {bottom: 0, left: 0, position: 'absolute', right: 0, top: 0},
  previewShade: {backgroundColor: 'rgba(23,17,41,0.22)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0},
  processingShade: {backgroundColor: theme.colors.darkWorkspace, opacity: 1, zIndex: 2},
  viewportMessage: {alignItems: 'center', bottom: 178, flexDirection: 'row', gap: 8, justifyContent: 'center', left: 16, position: 'absolute', right: 16, zIndex: 3},
  viewportMessageText: {color: theme.colors.surfaceDefault, fontSize: 15, fontWeight: '800', textAlign: 'center'},
  statusArea: {alignItems: 'center', left: 20, minHeight: 26, paddingHorizontal: 0, position: 'absolute', right: 20, zIndex: 4},
  permissionText: {color: theme.colors.canvasWarm, fontSize: 12, textAlign: 'center'},
  errorText: {color: '#FF9C9F', fontSize: 12, marginTop: 3, textAlign: 'center'},
  controls: {alignItems: 'center', backgroundColor: 'rgba(76,66,108,0.88)', borderRadius: 26, flexDirection: 'row', justifyContent: 'space-between', left: 14, minHeight: 112, paddingHorizontal: 28, paddingTop: 16, position: 'absolute', right: 14, zIndex: 4},
  sideAction: {alignItems: 'center', minHeight: 64, justifyContent: 'center', minWidth: 62},
  sideIcon: {alignItems: 'center', borderColor: 'rgba(255,248,215,0.75)', borderRadius: 16, borderWidth: 2, height: 48, justifyContent: 'center', width: 48},
  sideLabel: {color: theme.colors.canvasWarm, fontSize: 12, fontWeight: '700', marginTop: 4},
  shutter: {alignItems: 'center', backgroundColor: theme.colors.canvasWarm, borderColor: theme.colors.actionPrimary, borderRadius: 45, borderWidth: 7, height: 88, justifyContent: 'center', width: 88},
  shutterInner: {backgroundColor: theme.colors.canvasWarm, borderColor: theme.colors.inkPrimary, borderRadius: 33, borderWidth: 5, height: 66, width: 66},
  shutterPressed: {transform: [{scale: 0.94}]},
  shutterDisabled: {opacity: 0.62},
});

export default CameraScreen;
