/* eslint-disable no-void */
import React, {useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, IconButton, ProgressBar, TextInput} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';

import {theme} from '../theme/theme';

export type PdfOrientation = 'auto' | 'portrait' | 'landscape';

export interface ExportScreenProps {
  pageCount?: number;
  initialFileName?: string;
  onBack?: () => void;
  onExport?: (fileName: string, orientation: PdfOrientation) => void | Promise<void>;
  onOpenPreview?: () => void;
  onShare?: () => void;
  existingFileNames?: string[];
}

export function nextAvailablePdfName(input: string, existingNames: string[]): string {
  const trimmed = input.trim();
  const base = trimmed.toLowerCase().endsWith('.pdf') ? trimmed.slice(0, -4) : trimmed;
  const normalized = `${base}.pdf`;
  const names = new Set(existingNames.map(name => name.toLowerCase()));
  if (!names.has(normalized.toLowerCase())) return normalized;
  let index = 1;
  while (names.has(`${base} (${index}).pdf`.toLowerCase())) index += 1;
  return `${base} (${index}).pdf`;
}

function ExportScreen({
  pageCount = 0,
  initialFileName = '扫描文档 20260827-1430.pdf',
  onBack,
  onExport,
  onOpenPreview,
  onShare,
  existingFileNames = [],
}: ExportScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [fileName, setFileName] = useState(initialFileName.replace(/\.pdf$/i, ''));
  const [orientation, setOrientation] = useState<PdfOrientation>('auto');
  const [exported, setExported] = useState(false);
  const [progress, setProgress] = useState(0);
  const exportMetadata = useMemo(() => ({storageLocation: 'App 沙盒'}), []);
  const showStorageLocation = false;
  const estimatedSize = useMemo(() => `约 ${(Math.max(pageCount, 0) * 0.8).toFixed(1)} MB`, [pageCount]);

  async function performExport(finalName: string): Promise<void> {
    setFileName(finalName.replace(/\.pdf$/i, ''));
    setProgress(0.35);
    try {
      await onExport?.(finalName, orientation);
      setProgress(1);
      setExported(true);
    } catch {
      setProgress(0);
      Alert.alert('导出失败', 'PDF 生成失败，请重试。');
    }
  }

  function exportPdf(): void {
    const normalized = fileName.trim();
    if (!normalized) {
      Alert.alert('请输入文件名', '文件名不能为空。');
      return;
    }
    const finalName = normalized.toLowerCase().endsWith('.pdf') ? normalized : `${normalized}.pdf`;
    const conflict = existingFileNames.some(name => name.toLowerCase() === finalName.toLowerCase());
    if (!conflict) {
      void performExport(finalName);
      return;
    }
    Alert.alert('文件已存在', '请选择覆盖原文件，或另存为新文件。', [
      {text: '取消', style: 'cancel'},
      {text: '另存一份', onPress: () => { void performExport(nextAvailablePdfName(finalName, existingFileNames)); }},
      {text: '覆盖', style: 'destructive', onPress: () => { void performExport(finalName); }},
    ]);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + theme.spacing.sm}]}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>导出 PDF</Text>
          <Text style={styles.subtitle}>默认 A4，保留 10mm 白边</Text>
        </View>
        <IconButton
          accessibilityLabel="返回页面管理"
          icon={renderBackIcon}
          iconColor={theme.colors.inkPrimary}
          onPress={onBack}
          size={27}
          style={styles.headerButton}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>文件名</Text>
          <TextInput
            accessibilityLabel="PDF 文件名"
            mode="outlined"
            onChangeText={setFileName}
            style={styles.fileInput}
            outlineColor={theme.colors.inkPrimary}
            activeOutlineColor={theme.colors.inkPrimary}
            value={fileName}
            autoCapitalize="none"
            autoCorrect={false}
            dense
          />

          <Text style={[styles.fieldLabel, styles.orientationLabel]}>页面方向</Text>
          <View style={styles.segmented} accessibilityRole="radiogroup">
            <OrientationButton label="自动" value="auto" selected={orientation === 'auto'} onPress={setOrientation} />
            <OrientationButton label="竖版" value="portrait" selected={orientation === 'portrait'} onPress={setOrientation} />
            <OrientationButton label="横版" value="landscape" selected={orientation === 'landscape'} onPress={setOrientation} />
          </View>

          <View style={styles.summaryList}>
            <InfoRow label="页面" value={`${pageCount} 页`} />
            {/* 保存位置能力保留在导出配置中，当前按产品要求暂不展示。 */}
            {showStorageLocation && <InfoRow label="保存位置" value={exportMetadata.storageLocation} />}
            <InfoRow label="预计体积" value={estimatedSize} last />
          </View>

          <ProgressBar
            accessibilityLabel="导出进度"
            progress={progress}
            color={theme.colors.actionPrimary}
            style={[styles.progress, progress === 0 && styles.progressIdle]}
          />

          {exported ? (
            <View style={styles.successPanel} accessibilityLiveRegion="polite">
              <Text style={styles.successTitle}>PDF 已保存，扫描工程仍可继续编辑。</Text>
              <Text style={styles.successMeta}>重要文件建议通过分享转存到其他 App。</Text>
              <View style={styles.successShareWrapper}>
                <View pointerEvents="none" style={styles.successShareShadow} />
                <Button
                  accessibilityLabel="分享 PDF"
                  mode="contained"
                  onPress={onShare}
                  buttonColor={theme.colors.actionPrimary}
                  textColor={theme.colors.surfaceDefault}
                  style={styles.successShareButton}
                  contentStyle={styles.successShareContent}
                  labelStyle={styles.successShareLabel}
                  uppercase={false}>
                  分享 PDF
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.bottom, {paddingBottom: insets.bottom + theme.spacing.lg}]}>
        <View style={styles.bottomActions}>
          <ActionButton label="打开预览" secondary onPress={onOpenPreview} disabled={!exported} />
          <ActionButton label="导出 PDF" onPress={exportPdf} />
        </View>
      </View>
    </View>
  );
}

function OrientationButton({
  label,
  value,
  selected,
  onPress,
}: {
  label: string;
  value: PdfOrientation;
  selected: boolean;
  onPress: (value: PdfOrientation) => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={`页面方向：${label}`}
      accessibilityRole="radio"
      accessibilityState={{selected}}
      onPress={() => onPress(value)}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}>
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress?: () => void;
  secondary?: boolean;
  disabled?: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.actionWrapper, disabled && styles.actionWrapperDisabled]}>
      {!secondary && <View pointerEvents="none" style={styles.actionShadow} />}
      <Button
        accessibilityLabel={label}
        accessibilityState={{disabled}}
        disabled={disabled}
        mode={secondary ? 'outlined' : 'contained'}
        onPress={onPress}
        buttonColor={secondary ? theme.colors.canvasWarm : theme.colors.actionPrimary}
        textColor={secondary ? theme.colors.textMuted : theme.colors.surfaceDefault}
        style={[styles.actionButton, secondary && styles.secondaryAction]}
        contentStyle={styles.actionContent}
        labelStyle={[styles.actionLabel, secondary && styles.secondaryActionLabel]}
        uppercase={false}>
        {label}
      </Button>
    </View>
  );
}

function InfoRow({label, value, last = false}: {label: string; value: string; last?: boolean}): React.JSX.Element {
  return <View style={[styles.infoRow, last && styles.infoRowLast]}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

function renderBackIcon({color, size}: {color: string; size: number}): React.JSX.Element {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}/></Svg>;
}

const styles = StyleSheet.create({
  screen: {backgroundColor: theme.colors.surfaceDefault, flex: 1},
  header: {alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: theme.spacing.lg, paddingHorizontal: theme.spacing.lg},
  headerCopy: {flex: 1, paddingTop: theme.spacing.xs},
  title: {color: theme.colors.inkPrimary, fontSize: 34, fontWeight: '800', letterSpacing: 0, lineHeight: 40},
  subtitle: {color: theme.colors.inkSecondary, fontSize: 18, fontWeight: '600', lineHeight: 25, marginTop: theme.spacing.xs},
  headerButton: {borderColor: theme.colors.inkPrimary, borderRadius: theme.radii.md, borderWidth: 2, height: 56, margin: 0, width: 56},
  content: {backgroundColor: theme.colors.surfaceDefault, flex: 1, paddingHorizontal: theme.spacing.lg},
  formCard: {backgroundColor: theme.colors.canvasWarm, borderColor: theme.colors.inkPrimary, borderRadius: theme.radii.lg, borderWidth: 3, elevation: 5, padding: theme.spacing.lg, shadowColor: theme.colors.inkPrimary, shadowOffset: {height: 9, width: 9}, shadowOpacity: 0.2, shadowRadius: 0},
  fieldLabel: {color: theme.colors.textMuted, fontSize: 20, lineHeight: 27, marginBottom: theme.spacing.xs},
  fileInput: {backgroundColor: theme.colors.surfaceDefault, fontSize: 20, height: 58, marginBottom: theme.spacing.lg},
  orientationLabel: {marginBottom: theme.spacing.sm},
  segmented: {backgroundColor: '#FFEFA4', borderColor: theme.colors.inkPrimary, borderRadius: theme.radii.lg, borderWidth: 3, flexDirection: 'row', minHeight: 76, padding: theme.spacing.xs},
  segmentButton: {alignItems: 'center', borderRadius: theme.radii.md, flex: 1, justifyContent: 'center', minHeight: 66},
  segmentButtonSelected: {backgroundColor: theme.colors.actionPrimary, elevation: 2, shadowColor: theme.colors.inkPrimary, shadowOffset: {height: 3, width: 3}, shadowOpacity: 1, shadowRadius: 0},
  segmentText: {color: theme.colors.textMuted, fontSize: 20, fontWeight: '700'},
  segmentTextSelected: {color: theme.colors.surfaceDefault},
  summaryList: {marginTop: theme.spacing.lg},
  infoRow: {alignItems: 'center', borderBottomColor: theme.colors.borderLight, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 67},
  infoRowLast: {borderBottomWidth: 0},
  infoLabel: {color: theme.colors.inkPrimary, fontSize: 20},
  infoValue: {color: theme.colors.inkPrimary, fontSize: 20, fontWeight: '800'},
  progress: {backgroundColor: theme.colors.surfaceWarm, borderColor: theme.colors.inkPrimary, borderRadius: 8, borderWidth: 2, height: 10, marginTop: theme.spacing.lg, overflow: 'hidden'},
  progressIdle: {opacity: 1},
  successPanel: {borderTopColor: theme.colors.borderLight, borderTopWidth: 1, marginTop: theme.spacing.md, paddingTop: theme.spacing.md},
  successTitle: {color: theme.colors.inkPrimary, fontSize: 16, fontWeight: '800'},
  successMeta: {color: theme.colors.textMuted, fontSize: 13, marginTop: 4},
  successShareWrapper: {marginTop: theme.spacing.md, position: 'relative', width: '100%'},
  successShareShadow: {backgroundColor: theme.colors.inkPrimary, borderRadius: theme.radii.md, bottom: -5, left: 5, position: 'absolute', right: -5, top: 5},
  successShareButton: {borderRadius: theme.radii.md, width: '100%'},
  successShareContent: {minHeight: 50},
  successShareLabel: {fontSize: 18, fontWeight: '800'},
  bottom: {backgroundColor: theme.colors.canvasWarm, borderTopColor: theme.colors.borderLight, borderTopWidth: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg},
  bottomActions: {flexDirection: 'row', gap: theme.spacing.md},
  actionWrapper: {flex: 1, position: 'relative'},
  actionWrapperDisabled: {opacity: 0.58},
  actionShadow: {backgroundColor: theme.colors.inkPrimary, borderRadius: theme.radii.lg, bottom: -7, left: 7, position: 'absolute', right: -7, top: 7},
  actionButton: {borderRadius: theme.radii.lg, width: '100%'},
  secondaryAction: {borderColor: theme.colors.textMuted, borderWidth: 2},
  actionContent: {minHeight: 64, paddingHorizontal: theme.spacing.sm},
  actionLabel: {fontSize: 21, fontWeight: '800'},
  secondaryActionLabel: {fontSize: 19},
});

export default ExportScreen;
