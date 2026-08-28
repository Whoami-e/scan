/**
 * 首页骨架。
 *
 * 这里先实现 PRD 要求的两个首页地标：
 * - 用户第一次打开时能看到“还没有扫描文档”的空状态。
 * - 有一个明显的“开始扫描”主入口。
 *
 * 相机、相册、历史文档和导航尚未接入，因此按钮暂时只展示占位提示。
 * 这能让工程先通过编译并保留真实流程的接入位置，不把未完成能力伪装成可用。
 */

import React from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import {theme} from '../theme/theme';

function HomeScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  function handleStartScan(): void {
    Alert.alert('扫描入口', '相机和相册能力将在后续阶段接入。');
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
        },
      ]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>本地优先 · 离线保存</Text>
        <Text accessibilityRole="header" style={styles.title}>
          文档扫描
        </Text>
        <Text style={styles.subtitle}>
          把纸质资料整理成清晰、规整、可分享的 PDF。
        </Text>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyStateMark}>+</Text>
        <Text style={styles.emptyStateTitle}>还没有扫描文档</Text>
        <Text style={styles.emptyStateDescription}>
          扫描结果会保存在 App 沙盒中，不上传文档内容。
        </Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton label="开始扫描" onPress={handleStartScan} />
        <Text style={styles.footerNote}>支持拍照和从相册导入</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.canvasWarm,
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.colors.actionPrimary,
    fontSize: theme.typography.caption,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: theme.colors.inkPrimary,
    fontSize: theme.typography.title,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    color: theme.colors.inkSecondary,
    fontSize: theme.typography.body,
    lineHeight: 24,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginVertical: theme.spacing.lg,
    padding: theme.spacing.xl,
  },
  emptyStateMark: {
    color: theme.colors.actionPrimary,
    fontSize: 54,
    fontWeight: '300',
    lineHeight: 58,
  },
  emptyStateTitle: {
    color: theme.colors.inkPrimary,
    fontSize: theme.typography.sectionTitle,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
  },
  emptyStateDescription: {
    color: theme.colors.inkSecondary,
    fontSize: theme.typography.body,
    lineHeight: 23,
    marginTop: theme.spacing.sm,
    maxWidth: 300,
    textAlign: 'center',
  },
  footer: {
    gap: theme.spacing.sm,
  },
  footerNote: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
    textAlign: 'center',
  },
});

export default HomeScreen;
