import React, {useEffect, useRef, useState} from 'react';
import {Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View} from 'react-native';
import {Button, IconButton, Surface} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Path} from 'react-native-svg';

import {ScanPage} from '../data/models';
import {theme} from '../theme/theme';

const EMPTY_PAGES: ScanPage[] = [];

export interface PagesScreenProps {
  documentTitle?: string;
  pages?: ScanPage[];
  updatedLabel?: string;
  onBack?: () => void;
  onContinueScan?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onRename?: (title: string) => void;
  onDeletePage?: (pageId: string) => void;
  onDeleteDocument?: () => void;
  onReorder?: (pages: ScanPage[]) => void;
}

function PagesScreen({
  documentTitle = '未命名文档',
  pages = EMPTY_PAGES,
  onBack,
  onContinueScan,
  onImport,
  onExport,
  onRename,
  onDeletePage,
  onReorder,
}: PagesScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const [localPages, setLocalPages] = useState<ScanPage[]>(pages);
  const [preview, setPreview] = useState<{page: ScanPage; index: number}>();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(() => untitledTitle(documentTitle));
  const onRenameRef = useRef(onRename);

  useEffect(() => setLocalPages(pages), [pages]);
  useEffect(() => {
    onRenameRef.current = onRename;
  }, [onRename]);
  useEffect(() => {
    if (documentTitle !== '未命名文档' && documentTitle !== title) {
      setTitle(documentTitle);
      setEditingTitle(false);
      return;
    }
    if (documentTitle === '未命名文档' && title !== documentTitle) {
      onRenameRef.current?.(title);
    }
  }, [documentTitle, title]);
  const visiblePages = localPages.length === 0 && pages.length > 0 ? pages : localPages;

  function commitRename(): void {
    const nextTitle = title.trim();
    if (!nextTitle) {
      return;
    }
    setTitle(nextTitle);
    setEditingTitle(false);
    onRename?.(nextTitle);
  }

  function confirmDelete(page: ScanPage): void {
    Alert.alert('删除此页？', '页面会从当前扫描工程移除。MVP 不支持撤销。', [
      {text: '取消', style: 'cancel'},
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const nextPages = localPages.filter(item => item.id !== page.id);
          setLocalPages(nextPages);
          onDeletePage?.(page.id);
          onReorder?.(nextPages);
        },
      },
    ]);
  }

  function movePage(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= localPages.length) {
      return;
    }
    const nextPages = [...localPages];
    [nextPages[index], nextPages[target]] = [nextPages[target], nextPages[index]];
    setLocalPages(nextPages);
    onReorder?.(nextPages);
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + theme.spacing.lg}]}>
        <IconButton accessibilityLabel="返回首页" icon={renderBackIcon} iconColor={theme.colors.inkPrimary} onPress={onBack} size={24} style={styles.backButton} />
        <View style={styles.headerCopy}>
          <Text accessibilityElementsHidden style={styles.srOnly}>当前文档</Text>
          {editingTitle ? (
            <TextInput
              accessibilityLabel="文档标题输入框"
              autoFocus
              onBlur={commitRename}
              onChangeText={setTitle}
              onSubmitEditing={commitRename}
              returnKeyType="done"
              style={styles.titleInput}
              value={title}
            />
          ) : (
            <Pressable accessibilityLabel="编辑文档标题" accessibilityRole="button" onPress={() => setEditingTitle(true)}>
              <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>{title}</Text>
            </Pressable>
          )}
          <Text style={styles.updated}>{visiblePages.length} 页 · 长按或按钮调整顺序</Text>
        </View>
        <IconButton accessibilityLabel="再拍别的照片" icon={renderRescanIcon} iconColor={theme.colors.inkPrimary} onPress={onContinueScan} size={24} style={styles.rescanButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {visiblePages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>还没有页面</Text>
            <Text style={styles.emptyText}>再拍或从相册导入页面。</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {visiblePages.map((page, index) => (
              <Surface elevation={2} key={page.id} style={[styles.pageItem, index === 0 && styles.selectedPage]}>
                <View style={styles.pageNumber}><Text style={styles.pageNumberText}>{index + 1}</Text></View>
                <View style={styles.thumbnail} accessibilityLabel={`第 ${index + 1} 页预览`}>
                  <View style={styles.thumbPaper}>{Array.from({length: 10}).map((_, line) => <View key={line} style={styles.thumbLine} />)}</View>
                </View>
                <Text style={styles.pageMeta} numberOfLines={1}>{pageName(index)} · {modeLabel(page.enhanceMode)}</Text>
                <View style={styles.pageActions}>
                  <Pressable accessibilityLabel={`预览第 ${index + 1} 页`} onPress={() => setPreview({page, index})} style={styles.miniButton}><Text style={styles.miniButtonText}>预览</Text></Pressable>
                  <Pressable accessibilityLabel={`第 ${index + 1} 页上移`} disabled={index === 0} onPress={() => movePage(index, -1)} style={[styles.miniButton, index === 0 && styles.disabledMiniButton]}><Text style={styles.miniButtonText}>上移</Text></Pressable>
                  <Pressable accessibilityLabel={`删除第 ${index + 1} 页`} onPress={() => confirmDelete(page)} style={[styles.miniButton, styles.deleteMiniButton]}><Text style={styles.deleteMiniButtonText}>删除</Text></Pressable>
                </View>
              </Surface>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setPreview(undefined)} transparent visible={Boolean(preview)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewDialog}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{preview ? `第 ${preview.index + 1} 页` : '页面预览'}</Text>
              <Pressable accessibilityLabel="关闭页面预览" accessibilityRole="button" onPress={() => setPreview(undefined)} style={styles.previewCloseButton}>
                <Text style={styles.previewCloseText}>关闭</Text>
              </Pressable>
            </View>
            {preview?.page.processedImagePath || preview?.page.originalImagePath ? (
              <Image accessibilityLabel={`第 ${(preview?.index ?? 0) + 1} 页大图预览`} resizeMode="contain" source={{uri: preview.page.processedImagePath ?? preview.page.originalImagePath}} style={[styles.previewImage, {height: Math.min(520, Math.max(240, windowHeight * 0.62))}]} />
            ) : (
              <View accessibilityLabel={`第 ${(preview?.index ?? 0) + 1} 页大图预览`} style={styles.previewEmpty}>
                <Text style={styles.previewEmptyText}>暂无图片预览</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <View style={[styles.bottom, {paddingBottom: insets.bottom + theme.spacing.md}]}>
        <Button accessibilityLabel="相册导入" compact mode="outlined" onPress={onImport} textColor={theme.colors.inkPrimary} style={styles.bottomButton} contentStyle={styles.bottomButtonContent}>相册导入</Button>
        <Button accessibilityLabel="导出 PDF" compact mode="contained" onPress={onExport} buttonColor={theme.colors.actionPrimary} style={styles.exportButton} contentStyle={styles.bottomButtonContent}>导出 PDF</Button>
      </View>
    </View>
  );
}

function untitledTitle(title: string): string {
  return title === '未命名文档' ? `未命名文档 ${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}` : title;
}

function pageName(index: number): string {
  return ['A4 文档', '手写笔记', '报销单'][index] ?? '扫描页面';
}

function modeLabel(mode: ScanPage['enhanceMode']): string {
  return {original: '原图', enhanced: '增强', grayscale: '灰度', blackwhite: '黑白'}[mode] ?? '原图';
}

function renderRescanIcon({color, size}: {color: string; size: number}) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M12 8v8M8 12h8" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}/></Svg>;
}

function renderBackIcon({color, size}: {color: string; size: number}) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}/></Svg>;
}

const styles = StyleSheet.create({
  screen: {backgroundColor: theme.colors.surfaceDefault, flex: 1},
  header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 128, paddingBottom: theme.spacing.sm, paddingHorizontal: theme.spacing.lg},
  backButton: {backgroundColor: theme.colors.surfaceDefault, borderColor: theme.colors.inkPrimary, borderRadius: 18, borderWidth: 3, margin: 0},
  headerCopy: {alignItems: 'center', flex: 1, minWidth: 0},
  title: {color: theme.colors.inkPrimary, fontSize: theme.typography.title, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center'},
  titleInput: {borderBottomColor: theme.colors.actionPrimary, borderBottomWidth: 3, color: theme.colors.inkPrimary, fontSize: theme.typography.title, fontWeight: '800', height: 42, paddingHorizontal: 0, paddingVertical: 0, textAlign: 'center'},
  updated: {color: theme.colors.inkSecondary, fontSize: theme.typography.body, fontWeight: '600', marginTop: theme.spacing.xs, textAlign: 'center'},
  rescanButton: {backgroundColor: theme.colors.surfaceDefault, borderColor: theme.colors.inkPrimary, borderRadius: 18, borderWidth: 3, margin: 0},
  content: {backgroundColor: theme.colors.surfaceDefault, flexGrow: 1, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm, paddingBottom: 120},
  grid: {columnGap: theme.spacing.md, flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.spacing.md},
  pageItem: {backgroundColor: theme.colors.surfaceWarm, borderColor: theme.colors.inkPrimary, borderRadius: 22, borderWidth: 3, elevation: 3, minHeight: 272, padding: theme.spacing.sm, shadowColor: theme.colors.shadowInk, shadowOffset: {height: 7, width: 7}, shadowOpacity: 1, shadowRadius: 0, width: '46%'},
  selectedPage: {borderColor: theme.colors.actionPrimary, shadowColor: theme.colors.shadowAction},
  pageNumber: {alignItems: 'center', backgroundColor: theme.colors.actionPrimary, borderColor: theme.colors.inkPrimary, borderRadius: 10, borderWidth: 3, height: 27, justifyContent: 'center', left: theme.spacing.sm, position: 'absolute', top: theme.spacing.sm, width: 27, zIndex: 2},
  pageNumberText: {color: theme.colors.surfaceDefault, fontSize: 14, fontWeight: '800'},
  thumbnail: {alignItems: 'center', aspectRatio: 0.76, backgroundColor: '#FFEFA0', borderColor: theme.colors.inkPrimary, borderRadius: 17, borderWidth: 3, justifyContent: 'center', overflow: 'hidden', width: '100%'},
  thumbPaper: {backgroundColor: '#FFF9DF', borderRadius: 8, height: '72%', justifyContent: 'space-evenly', paddingVertical: 3, shadowColor: theme.colors.inkPrimary, shadowOffset: {height: 6, width: 5}, shadowOpacity: 0.26, shadowRadius: 0, width: '68%'},
  thumbLine: {backgroundColor: '#BDB7A4', height: 2, marginHorizontal: 0},
  pageMeta: {color: theme.colors.textMuted, fontSize: 14, marginTop: theme.spacing.sm},
  pageActions: {flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.sm},
  miniButton: {alignItems: 'center', borderColor: theme.colors.inkPrimary, borderRadius: 14, borderWidth: 3, flex: 1, height: 36, justifyContent: 'center'},
  disabledMiniButton: {opacity: 1},
  miniButtonText: {color: theme.colors.inkPrimary, fontSize: 14, fontWeight: '800'},
  deleteMiniButton: {borderColor: theme.colors.inkPrimary},
  deleteMiniButtonText: {color: theme.colors.danger, fontSize: 14, fontWeight: '800'},
  previewOverlay: {alignItems: 'center', backgroundColor: 'rgba(23,17,41,0.72)', flex: 1, justifyContent: 'center', padding: theme.spacing.lg},
  previewDialog: {backgroundColor: theme.colors.surfaceDefault, borderColor: theme.colors.inkPrimary, borderRadius: 22, borderWidth: 3, maxHeight: '86%', padding: theme.spacing.md, shadowColor: theme.colors.inkPrimary, shadowOffset: {height: 7, width: 7}, shadowOpacity: 1, shadowRadius: 0, width: '100%'},
  previewHeader: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm},
  previewTitle: {color: theme.colors.inkPrimary, fontSize: theme.typography.textLg, fontWeight: '800'},
  previewCloseButton: {borderColor: theme.colors.inkPrimary, borderRadius: 12, borderWidth: 2, minWidth: 64, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs},
  previewCloseText: {color: theme.colors.inkPrimary, fontSize: 14, fontWeight: '800', textAlign: 'center'},
  previewImage: {backgroundColor: theme.colors.surfaceWarm, width: '100%'},
  previewEmpty: {alignItems: 'center', backgroundColor: theme.colors.surfaceWarm, height: 240, justifyContent: 'center', width: '100%'},
  previewEmptyText: {color: theme.colors.textMuted, fontSize: theme.typography.body, fontWeight: '600'},
  empty: {alignItems: 'center', paddingTop: theme.spacing.xl},
  emptyTitle: {color: theme.colors.inkPrimary, fontSize: theme.typography.textLg, fontWeight: '800'},
  emptyText: {color: theme.colors.textMuted, fontSize: theme.typography.caption, marginTop: theme.spacing.sm},
  bottom: {backgroundColor: theme.colors.surfaceWarm, borderTopColor: theme.colors.inkPrimary, borderTopWidth: 3, flexDirection: 'row', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md},
  bottomButton: {borderColor: theme.colors.inkPrimary, borderRadius: 18, borderWidth: 3, flex: 1, shadowColor: theme.colors.inkPrimary, shadowOffset: {height: 4, width: 4}, shadowOpacity: 1, shadowRadius: 0},
  exportButton: {borderRadius: 18, flex: 1, shadowColor: theme.colors.inkPrimary, shadowOffset: {height: 4, width: 4}, shadowOpacity: 1, shadowRadius: 0},
  bottomButtonContent: {minHeight: 48, paddingHorizontal: 0},
  srOnly: {height: 0, opacity: 0, position: 'absolute', width: 0},
});

export default PagesScreen;
