import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {IconButton, Surface} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';

import {theme} from '../theme/theme';

export interface SettingsScreenProps {
  onBack?: () => void;
  onExportLogs?: () => void;
}

function SettingsScreen({onBack, onExportLogs}: SettingsScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + theme.spacing.md}]}>
        <Text accessibilityRole="header" style={styles.title}>设置</Text>
        <IconButton
          accessibilityLabel="返回首页"
          icon={renderBackIcon}
          iconColor={theme.colors.inkPrimary}
          onPress={onBack}
          size={22}
          style={styles.headerButton}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.settingsList}>
          <SettingRow
            title="本地保存"
            description="扫描工程和 PDF 默认保存在 App 沙盒内。"
          />
          <SettingRow
            title="卸载提醒"
            description="卸载 App 会删除沙盒内文件，重要 PDF 请先分享转存。"
          />
          <SettingRow
            title="本地日志"
            description="仅由你主动导出，不包含文档标题、路径或图片内容。"
            action={
              <IconButton
                accessibilityLabel="导出日志"
                accessibilityRole="button"
                icon={renderDownloadIcon}
                iconColor={theme.colors.inkPrimary}
                onPress={onExportLogs}
                size={22}
                style={styles.logButton}
              />
            }
          />
          <SettingRow
            title="版本"
            description="原型对应 PRD v2026-08-27.1"
            action={<View style={styles.versionTag}><Text style={styles.versionTagText}>MVP</Text></View>}
          />
        </View>
      </View>
    </View>
  );
}

function SettingRow({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}): React.JSX.Element {
  const [highlighted, setHighlighted] = useState(false);

  return (
    <Pressable
      accessibilityRole="summary"
      onHoverIn={() => setHighlighted(true)}
      onHoverOut={() => setHighlighted(false)}
      onPressIn={() => setHighlighted(true)}
      onPressOut={() => setHighlighted(false)}
      style={styles.pressableRow}>
      <View
        pointerEvents="none"
        style={[styles.shadowLayer, highlighted && styles.shadowLayerHighlighted]}
      />
      <Surface
        elevation={0}
        style={[styles.settingRow, highlighted && styles.settingRowHighlighted]}>
        <View style={styles.copy}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        {action}
      </Surface>
    </Pressable>
  );
}

function renderBackIcon({color, size}: {color: string; size: number}): React.JSX.Element {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}/></Svg>;
}

function renderDownloadIcon({color, size}: {color: string; size: number}): React.JSX.Element {
  return (
    <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3v12"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="m7 10 5 5 5-5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 21h14"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {backgroundColor: theme.colors.surfaceDefault, flex: 1},
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 128,
    paddingBottom: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    color: theme.colors.inkPrimary,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 36,
  },
  headerButton: {
    backgroundColor: theme.colors.surfaceDefault,
    borderColor: theme.colors.inkPrimary,
    borderRadius: theme.radii.md,
    borderWidth: 2,
    margin: 0,
  },
  content: {
    backgroundColor: theme.colors.surfaceDefault,
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  settingsList: {gap: theme.spacing.md},
  pressableRow: {borderRadius: theme.radii.lg},
  shadowLayer: {
    backgroundColor: theme.colors.shadowInk,
    borderRadius: theme.radii.lg,
    bottom: -5,
    left: 5,
    position: 'absolute',
    right: -5,
    top: 5,
  },
  shadowLayerHighlighted: {backgroundColor: theme.colors.shadowAction},
  settingRow: {
    alignItems: 'center',
    backgroundColor: theme.colors.canvasWarm,
    borderColor: theme.colors.inkPrimary,
    borderRadius: theme.radii.lg,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    shadowColor: theme.colors.inkPrimary,
    shadowOffset: {height: 5, width: 5},
    shadowOpacity: 0.22,
    shadowRadius: 0,
  },
  settingRowHighlighted: {
    borderColor: theme.colors.actionPrimary,
    shadowColor: theme.colors.actionPrimary,
    shadowOpacity: 0.34,
  },
  copy: {flex: 1, minWidth: 0},
  rowTitle: {
    color: theme.colors.inkPrimary,
    fontSize: theme.typography.textLg,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: theme.spacing.xs,
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  logButton: {
    backgroundColor: theme.colors.surfaceDefault,
    borderColor: theme.colors.inkPrimary,
    borderRadius: 999,
    borderWidth: 2,
    height: 52,
    margin: 0,
    width: 52,
  },
  versionTag: {
    alignItems: 'center',
    borderColor: theme.colors.inkPrimary,
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: 'center',
    marginLeft: theme.spacing.sm,
    minWidth: 64,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  versionTagText: {color: theme.colors.inkPrimary, fontSize: theme.typography.body, fontWeight: '800'},
});

export default SettingsScreen;
