import React from 'react';
import {Alert, Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {IconButton, Surface} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import PrimaryButton from '../components/PrimaryButton';
import {theme} from '../theme/theme';
import Svg, {Path} from 'react-native-svg';
import {Document} from '../data/models';

export interface HomeScreenProps {
  onStartScan?: () => void;
  onSettings?: () => void;
  documents?: Document[];
  onOpenDocument?: (document: Document) => void;
  onDeleteDocument?: (document: Document) => void;
}

function HomeScreen({onStartScan, onSettings, documents = [], onOpenDocument, onDeleteDocument}: HomeScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  function handleStartScan(): void {
    if (onStartScan) {
      onStartScan();
      return;
    }

    Alert.alert('扫描入口', '相机和相册能力将在后续阶段接入。');
  }

  function handleSettings(): void {
    if (onSettings) {
      onSettings();
      return;
    }

    Alert.alert('设置', '设置功能将在后续阶段接入。');
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 8}]}>
        <View>
          <Text accessibilityRole="header" style={styles.title}>
            文档
          </Text>
          <Text style={styles.viewSubtitle}>最近更新的扫描工程</Text>
        </View>
        <IconButton
          accessibilityLabel="进入设置"
          containerColor={theme.colors.surfaceDefault}
          icon={renderGearIcon}
          iconColor={theme.colors.inkPrimary}
          mode="outlined"
          onPress={handleSettings}
          size={22}
          style={styles.iconButton}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.contentInner}>
          {documents.length > 0 ? <View style={styles.documentList}>{documents.map(document => <Pressable key={document.id} accessibilityLabel={`打开文档${document.title}`} accessibilityRole="button" onPress={() => onOpenDocument?.(document)} style={styles.documentCard}><View style={styles.documentThumb}>{document.pages[0]?.thumbnailPath || document.pages[0]?.processedImagePath ? <Image resizeMode="cover" source={{uri: document.pages[0].thumbnailPath ?? document.pages[0].processedImagePath}} style={styles.documentImage} /> : <View style={styles.thumbPaper}><View style={styles.thumbLine} /><View style={styles.thumbLineShort} /></View>}</View><View style={styles.documentCopy}><Text numberOfLines={1} style={styles.documentTitle}>{document.title}</Text><Text style={styles.documentMeta}>{document.pages.length} 页 · {document.status === 'exported' ? '已导出' : '草稿'}</Text></View><IconButton accessibilityLabel={`删除文档${document.title}`} icon={renderTrashIcon} iconColor={theme.colors.danger} onPress={() => Alert.alert('删除文档？', '文档及关联图片会从本机移除。', [{text: '取消', style: 'cancel'}, {text: '删除', style: 'destructive', onPress: () => onDeleteDocument?.(document)}])} size={19} style={styles.documentDelete} /></Pressable>)}</View> : <View style={styles.emptyStateFrame}>
            <View pointerEvents="none" style={styles.emptyStateShadow} />
            <Surface elevation={0} style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>暂无文档</Text>
              <Text style={styles.emptyStateDescription}>
                点按下方按钮开始扫描。
              </Text>
            </Surface>
          </View>}
        </View>
      </View>

      <View
        style={[
          styles.bottomAction,
          {paddingBottom: insets.bottom + theme.spacing.lg - 2},
        ]}>
        <PrimaryButton
          accessibilityLabel="扫描"
          icon={renderScanIcon}
          label="扫描"
          onPress={handleStartScan}
        />
      </View>
    </View>
  );
}

function renderGearIcon({color, size}: {color: string; size: number}) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke={color} strokeWidth={1.7}/><Path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.57V21a2 2 0 0 1-4 0v-.07A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.87.34l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.57-1.04H3a2 2 0 0 1 0-4h.03A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.87l-.04-.04a2 2 0 0 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 8.96 4.6 1.7 1.7 0 0 0 10 3.03V3a2 2 0 0 1 4 0v.03a1.7 1.7 0 0 0 1.04 1.57 1.7 1.7 0 0 0 1.87-.34l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04a1.7 1.7 0 0 0-.34 1.87A1.7 1.7 0 0 0 20.97 10H21a2 2 0 0 1 0 4h-.03A1.7 1.7 0 0 0 19.4 15Z" fill="none" stroke={color} strokeLinejoin="round" strokeWidth={1.7}/></Svg>;
}

function renderScanIcon({color, size}: {color: string; size: number}) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}/><Path d="M8 12h8" fill="none" stroke={color} strokeLinecap="round" strokeWidth={1.8}/></Svg>;
}

function renderTrashIcon({color, size}: {color: string; size: number}) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v6m4-6v6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}/></Svg>;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.surfaceDefault,
    flex: 1,
  },
  header: {
    alignItems: 'flex-end',
    backgroundColor: theme.colors.surfaceDefault,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 92,
    paddingBottom: theme.spacing.sm + 4,
    paddingHorizontal: 20,
  },
  title: {
    color: theme.colors.inkPrimary,
    fontSize: theme.typography.title,
    fontWeight: '800',
    lineHeight: 34,
  },
  iconButton: {
    borderColor: theme.colors.inkPrimary,
    borderRadius: theme.radii.md,
    borderWidth: 2,
    margin: 0,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.surfaceDefault,
    paddingHorizontal: 20,
  },
  contentInner: {
    flex: 1,
    paddingTop: theme.spacing.md + 2,
  },
  documentList: {gap: theme.spacing.md},
  documentCard: {alignItems: 'center', backgroundColor: theme.colors.surfaceWarm, borderColor: theme.colors.inkPrimary, borderRadius: theme.radii.md, borderWidth: 2, flexDirection: 'row', minHeight: 100, padding: theme.spacing.sm},
  documentThumb: {alignItems: 'center', backgroundColor: theme.colors.surfaceDefault, borderRadius: theme.radii.sm, height: 76, justifyContent: 'center', overflow: 'hidden', width: 64},
  documentImage: {height: '100%', width: '100%'},
  thumbPaper: {backgroundColor: theme.colors.canvasWarm, borderColor: theme.colors.borderLight, borderRadius: 3, borderWidth: 1, height: 58, justifyContent: 'center', paddingHorizontal: 7, width: 42},
  thumbLine: {backgroundColor: theme.colors.inkSecondary, height: 3, marginBottom: 7, width: '100%'},
  thumbLineShort: {backgroundColor: theme.colors.textMuted, height: 2, width: '72%'},
  documentCopy: {flex: 1, minWidth: 0, paddingHorizontal: theme.spacing.sm},
  documentTitle: {color: theme.colors.inkPrimary, fontSize: theme.typography.body, fontWeight: '800'},
  documentMeta: {color: theme.colors.textMuted, fontSize: theme.typography.caption, marginTop: 4},
  documentDelete: {margin: 0},
  emptyStateFrame: {
    position: 'relative',
  },
  emptyStateShadow: {
    backgroundColor: theme.colors.shadowAction,
    borderRadius: theme.radii.md,
    bottom: -8,
    left: 8,
    position: 'absolute',
    right: -8,
    top: 8,
  },
  viewSubtitle: {
    color: theme.colors.inkSecondary,
    fontSize: theme.typography.caption,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceWarm,
    borderColor: theme.colors.actionPrimary,
    borderRadius: theme.radii.md,
    borderStyle: 'dashed',
    borderWidth: 3,
    height: 120,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 28,
    shadowColor: theme.colors.actionPrimary,
    shadowOffset: {height: 5, width: 5},
    shadowOpacity: 0.32,
    shadowRadius: 0,
  },
  emptyStateTitle: {
    color: theme.colors.inkPrimary,
    fontSize: theme.typography.textLg,
    fontWeight: '800',
    lineHeight: 24,
  },
  emptyStateDescription: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.caption,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  bottomAction: {
    backgroundColor: theme.colors.surfaceWarm,
    borderTopColor: theme.colors.inkPrimary,
    borderTopWidth: 3,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  scanIcon: {
    height: 19,
    position: 'relative',
    width: 19,
  },
  scanCorner: {
    height: 7,
    position: 'absolute',
    width: 7,
  },
  scanCornerTopLeft: {
    borderLeftWidth: 2,
    borderTopWidth: 2,
    left: 0,
    top: 0,
  },
  scanCornerTopRight: {
    borderRightWidth: 2,
    borderTopWidth: 2,
    right: 0,
    top: 0,
  },
  scanCornerBottomLeft: {
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    bottom: 0,
    left: 0,
  },
  scanCornerBottomRight: {
    borderBottomWidth: 2,
    borderRightWidth: 2,
    bottom: 0,
    right: 0,
  },
  scanLine: {
    height: 2,
    left: 5,
    position: 'absolute',
    right: 5,
    top: 8,
  },
});

export default HomeScreen;
