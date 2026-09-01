import React, {useEffect, useRef, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, IconButton} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EnhanceMode} from '../data/models';
import {theme} from '../theme/theme';
import Svg, {Path} from 'react-native-svg';

export interface EnhanceScreenProps {
  imagePath?: string;
  mode?: EnhanceMode;
  rotationDegrees?: 0 | 90 | 180 | 270;
  onBack?: () => void;
  onModeChange?: (mode: EnhanceMode) => void;
  onRotate?: () => void;
  onRecrop?: () => void;
  onAddPage?: (mode: EnhanceMode) => void;
}

const modes: Array<{key: EnhanceMode; label: string}> = [
  {key: 'original', label: '原图'},
  {key: 'enhanced', label: '增强'},
  {key: 'grayscale', label: '灰度'},
];

function EnhanceScreen({
  imagePath,
  mode = 'original',
  rotationDegrees = 0,
  onBack,
  onModeChange,
  onRotate,
  onRecrop,
  onAddPage,
}: EnhanceScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [selectedMode, setSelectedMode] = useState<EnhanceMode>(mode);
  const selectedModeRef = useRef<EnhanceMode>(mode);

  useEffect(() => {
    selectedModeRef.current = mode;
    setSelectedMode(mode);
  }, [mode]);

  function selectMode(nextMode: EnhanceMode): void {
    selectedModeRef.current = nextMode;
    setSelectedMode(nextMode);
    onModeChange?.(nextMode);
  }

  return (
    <View testID="enhance-screen" style={styles.screen}>
      <View testID="enhance-workspace" style={styles.workspace}>
        <View
          style={[styles.header, {paddingTop: insets.top + theme.spacing.sm}]}
        >
          <IconButton
            accessibilityLabel="返回裁剪"
            icon={renderBackIcon}
            iconColor={theme.colors.surfaceDefault}
            onPress={onBack}
            size={22}
            style={styles.headerButton}
          />
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>图像增强</Text>
            <Text style={styles.subtitle}>选择适合文档的清晰度</Text>
          </View>
          <IconButton
            accessibilityLabel="旋转页面"
            icon={renderRotateIcon}
            iconColor={theme.colors.canvasWarm}
            onPress={onRotate}
            size={22}
            style={styles.headerButton}
          />
        </View>

        <View style={styles.preview} accessibilityLabel="增强预览">
          <View testID="enhance-preview-paper" style={[styles.paper, (rotationDegrees === 90 || rotationDegrees === 270) && styles.paperLandscape]}>
            {imagePath ? <Image accessibilityLabel="增强后的照片" resizeMode="contain" source={{uri: imagePath}} style={styles.previewImage} /> : null}
          </View>
          <Text style={styles.previewHint}>预览效果</Text>
        </View>
      </View>

      <View testID="enhance-tools" style={[styles.tools, {paddingBottom: Math.max(insets.bottom + theme.spacing.sm, theme.spacing.md)}]}>
        <Text style={styles.modeLabel}>增强模式</Text>
        <View style={styles.segmented} accessibilityRole="tablist">
          {modes.map(item => (
            <Pressable
              key={item.key}
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{selected: selectedMode === item.key}}
              onPress={() => selectMode(item.key)}
              style={[styles.segment, selectedMode === item.key && styles.segmentActive]}>
              <Text style={[styles.segmentText, selectedMode === item.key && styles.segmentTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.toolRow}>
          <Button
            accessibilityLabel="重新裁剪"
            mode="contained"
            onPress={onRecrop}
            buttonColor={theme.colors.darkSurface}
            textColor={theme.colors.surfaceDefault}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            重裁剪
          </Button>
          <Button
            accessibilityLabel="加入文档"
            mode="contained"
            onPress={() => onAddPage?.(selectedModeRef.current)}
            buttonColor={theme.colors.actionPrimary}
            textColor={theme.colors.surfaceDefault}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            加入文档
          </Button>
        </View>
      </View>
    </View>
  );
}

function renderBackIcon({color, size}: {color: string; size: number}): React.JSX.Element {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} /></Svg>;
}

function renderRotateIcon({color, size}: {color: string; size: number}): React.JSX.Element {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="M21 12a9 9 0 1 1-3-6.7L21 8" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} /><Path d="M21 3v5h-5" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.9} /></Svg>;
}

const styles = StyleSheet.create({
  screen: {backgroundColor: theme.colors.surfaceDefault, flex: 1},
  workspace: {backgroundColor: theme.colors.surfaceDefault, flex: 1},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 72, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.md},
  headerButton: {backgroundColor: theme.colors.darkWorkspace, borderColor: 'rgba(255,255,255,0.35)', borderRadius: theme.radii.sm, borderWidth: 1, margin: 0},
  headerCopy: {alignItems: 'center', flex: 1, paddingHorizontal: theme.spacing.sm},
  title: {color: theme.colors.inkPrimary, fontSize: theme.typography.textLg, fontWeight: '800', lineHeight: 24},
  subtitle: {color: theme.colors.inkSecondary, fontSize: theme.typography.caption, marginTop: 2},
  preview: {alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: theme.spacing.lg},
  paper: {aspectRatio: 0.71, backgroundColor: theme.colors.surfaceDefault, borderRadius: theme.radii.sm, elevation: 6, maxHeight: '100%', maxWidth: 400, overflow: 'hidden', shadowColor: '#000', shadowOffset: {height: 18, width: 0}, shadowOpacity: 0.42, shadowRadius: 22, width: '96%'},
  paperLandscape: {aspectRatio: 1.41},
  previewImage: {bottom: 0, height: '100%', left: 0, position: 'absolute', right: 0, top: 0, width: '100%'},
  previewHint: {color: theme.colors.textMuted, fontSize: theme.typography.caption, marginTop: theme.spacing.md},
  tools: {backgroundColor: theme.colors.darkSurface, borderRadius: theme.radii.lg, gap: theme.spacing.sm, margin: theme.spacing.md, padding: theme.spacing.md},
  modeLabel: {color: 'rgba(255,255,255,0.65)', fontSize: theme.typography.caption, fontWeight: '700'},
  segmented: {backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: theme.radii.sm, flexDirection: 'row', padding: 3},
  segment: {alignItems: 'center', borderRadius: theme.radii.sm - 2, flex: 1, justifyContent: 'center', minHeight: 38},
  segmentActive: {backgroundColor: 'rgba(255,107,0,0.86)'},
  segmentText: {color: '#D8D8DF', fontSize: 13, fontWeight: '700'},
  segmentTextActive: {color: theme.colors.surfaceDefault},
  toolRow: {flexDirection: 'row', gap: theme.spacing.sm},
  secondaryButton: {borderRadius: theme.radii.sm, flex: 1},
  primaryButton: {borderRadius: theme.radii.sm, flex: 1},
  buttonContent: {minHeight: 46},
  buttonLabel: {fontSize: theme.typography.button, fontWeight: '800'},
});

export default EnhanceScreen;
