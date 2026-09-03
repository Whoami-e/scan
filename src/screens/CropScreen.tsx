import React, {useEffect, useRef, useState} from 'react';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Button, IconButton} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {theme} from '../theme/theme';
import Svg, {Path} from 'react-native-svg';

export type CornerId = 'tl' | 'tr' | 'br' | 'bl';

export type CropCorner = {
  x: number;
  y: number;
};

export type CropCorners = Record<CornerId, CropCorner>;

export interface CropScreenProps {
  imagePath?: string;
  initialCorners?: CropCorners;
  onBack?: () => void;
  onRetake?: () => void;
  onConfirm?: (corners: CropCorners) => void;
  onRedetect?: () => void;
}

const DEFAULT_CORNERS: CropCorners = {
  tl: {x: 0.13, y: 0.1},
  tr: {x: 0.86, y: 0.14},
  br: {x: 0.82, y: 0.89},
  bl: {x: 0.17, y: 0.86},
};

const HANDLE_SIZE = 48;
const HANDLE_CORE_SIZE = 28;
const HANDLE_HIT_SLOP = 12;
const EDGE_COLOR = theme.colors.actionPrimary;

function CropScreen({
  onBack = () => undefined,
  onRetake = () => undefined,
  onConfirm = () => undefined,
  onRedetect = () => undefined,
  imagePath,
  initialCorners,
}: CropScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [corners, setCorners] = useState<CropCorners>(initialCorners ?? DEFAULT_CORNERS);
  const cornersRef = useRef(corners);
  const dragStartRef = useRef<CropCorner | null>(null);
  const respondersRef = useRef<Partial<Record<CornerId, ReturnType<typeof PanResponder.create>>>>({});
  const paperSizeRef = useRef({height: 0, width: 0});
  const [paperSize, setPaperSize] = useState({height: 0, width: 0});

  useEffect(() => {
    if (initialCorners) updateCorners(initialCorners);
  }, [initialCorners]);

  function updateCorners(next: CropCorners): void {
    cornersRef.current = next;
    setCorners(next);
  }

  function redetect(): void {
    updateCorners(DEFAULT_CORNERS);
    onRedetect();
  }

  function onPaperLayout(event: LayoutChangeEvent): void {
    const {height, width} = event.nativeEvent.layout;
    const nextSize = {height, width};
    paperSizeRef.current = nextSize;
    setPaperSize(nextSize);
  }

  function clamp(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  function getHandleResponder(id: CornerId) {
    if (!respondersRef.current[id]) {
      respondersRef.current[id] = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: () => {
          dragStartRef.current = {...cornersRef.current[id]};
        },
        onPanResponderMove: (_event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          if (!paperSizeRef.current.width || !paperSizeRef.current.height || !dragStartRef.current) {
            return;
          }
          const next = {
            ...cornersRef.current,
            [id]: {
              x: clamp(dragStartRef.current.x + gesture.dx / paperSizeRef.current.width),
              y: clamp(dragStartRef.current.y + gesture.dy / paperSizeRef.current.height),
            },
          } as CropCorners;
          updateCorners(next);
        },
        onPanResponderRelease: () => {
          dragStartRef.current = null;
        },
        onPanResponderTerminate: () => {
          dragStartRef.current = null;
        },
        onPanResponderTerminationRequest: () => false,
      });
    }
    return respondersRef.current[id]!;
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, {paddingTop: insets.top + theme.spacing.sm}]}>
        <IconButton
          accessibilityLabel="返回拍摄"
          icon={renderBackIcon}
          iconColor={theme.colors.surfaceDefault}
          onPress={onBack}
          size={24}
          style={styles.topIcon}
        />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            调整边缘
          </Text>
          <Text style={styles.subtitle}>拖动四角后确认裁剪</Text>
        </View>
        <IconButton
          accessibilityLabel="重新检测边缘"
          icon={renderRedetectIcon}
          iconColor={theme.colors.canvasWarm}
          onPress={redetect}
          size={24}
          style={styles.topIcon}
        />
      </View>

      <View style={styles.cropCanvas} testID="crop-canvas">
        <View onLayout={onPaperLayout} style={styles.paperFrame} testID="crop-frame">
          <View pointerEvents="none" style={styles.paperSurface}>
            {imagePath ? (
              <Image
                accessibilityLabel="待裁剪照片"
                resizeMode="cover"
                source={{uri: imagePath}}
                style={styles.capturedImage}
              />
            ) : null}
          </View>
          <View pointerEvents="none" style={styles.cropTint} />
          {(['tl', 'tr', 'br', 'bl'] as CornerId[]).map(id => {
            const responder = getHandleResponder(id);
            const corner = corners[id];
            return (
              <View
                key={id}
                accessibilityLabel={cornerLabel(id)}
                accessibilityRole="button"
                hitSlop={HANDLE_HIT_SLOP}
                style={[styles.handle, {left: `${corner.x * 100}%`, top: `${corner.y * 100}%`}]}
                {...responder.panHandlers}>
                <View style={styles.handleCore} />
              </View>
            );
          })}
          {paperSize.width > 0 &&
            (['tl', 'tr', 'br', 'bl'] as CornerId[]).map((id, index, ids) => {
              const from = corners[id];
              const to = corners[ids[(index + 1) % ids.length]];
              return <View key={`edge-${id}`} pointerEvents="none" style={edgeStyle(from, to, paperSize)} />;
            })}
        </View>
      </View>

      <View style={[styles.bottomBar, {paddingBottom: insets.bottom + theme.spacing.sm}]} testID="crop-actions">
        <View style={[styles.buttonShadow, styles.secondaryButtonShadow]} testID="button-shadow-retake">
          <View pointerEvents="none" style={styles.shadowLayer} testID="button-shadow-layer-retake" />
          <Button
            accessibilityLabel="重拍"
            mode="outlined"
            onPress={onRetake}
            textColor={theme.colors.surfaceDefault}
            style={styles.secondaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.secondaryLabel}
            uppercase={false}>
            重拍
          </Button>
        </View>
        <View style={[styles.buttonShadow, styles.primaryButtonShadow]} testID="button-shadow-confirm">
          <View pointerEvents="none" style={styles.shadowLayer} testID="button-shadow-layer-confirm" />
          <Button
            accessibilityLabel="确认裁剪"
            buttonColor={theme.colors.actionPrimary}
            mode="contained"
            onPress={() => onConfirm(cornersRef.current)}
            style={styles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.primaryLabel}
            uppercase={false}>
            确认裁剪
          </Button>
        </View>
      </View>
    </View>
  );
}

function cornerLabel(id: CornerId): string {
  return ({tl: '左上角控制点', tr: '右上角控制点', br: '右下角控制点', bl: '左下角控制点'})[id];
}

function edgeStyle(from: CropCorner, to: CropCorner, size: {width: number; height: number}) {
  const x1 = from.x * size.width;
  const y1 = from.y * size.height;
  const x2 = to.x * size.width;
  const y2 = to.y * size.height;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return {
    backgroundColor: EDGE_COLOR,
    height: 3,
    left: (x1 + x2) / 2 - length / 2,
    position: 'absolute' as const,
    top: (y1 + y2) / 2 - 1.5,
    transform: [{rotate: `${angle}rad`}],
    width: length,
  };
}

function renderBackIcon({color}: {color: string; size: number}): React.JSX.Element {
  return <Svg accessible={false} width={24} height={24} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} /></Svg>;
}

function renderRedetectIcon({color}: {color: string}): React.JSX.Element {
  return (
    <Svg accessible={false} height={21} width={21} viewBox="0 0 24 24">
      <Path
        d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2M18 2v4h-4M6 22v-4h4"
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: theme.colors.darkWorkspace,
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.md,
    paddingHorizontal: 14,
    zIndex: 2,
  },
  topIcon: {
    borderColor: theme.colors.canvasWarm,
    borderRadius: theme.radii.sm,
    borderWidth: 2,
    margin: 0,
  },
  backIcon: {
    fontSize: 40,
    fontWeight: '300',
    lineHeight: 32,
    textAlign: 'center',
  },
  heading: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    color: theme.colors.surfaceDefault,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: theme.typography.microcopy,
    marginTop: 2,
  },
  cropCanvas: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 90,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  paperFrame: {
    aspectRatio: 0.6,
    maxHeight: '100%',
    maxWidth: 360,
    position: 'relative',
    width: '94%',
  },
  paperSurface: {
    backgroundColor: theme.colors.canvasWarm,
    borderRadius: 7,
    elevation: 12,
    flex: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {height: 22, width: 0},
    shadowOpacity: 0.42,
    shadowRadius: 22,
  },
  capturedImage: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  cropTint: {
    backgroundColor: 'rgba(255,107,0,0.08)',
    borderRadius: 7,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  handle: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: HANDLE_SIZE / 2,
    height: HANDLE_SIZE,
    justifyContent: 'center',
    marginLeft: -HANDLE_SIZE / 2,
    marginTop: -HANDLE_SIZE / 2,
    position: 'absolute',
    width: HANDLE_SIZE,
  },
  handleCore: {
    backgroundColor: theme.colors.actionPrimary,
    borderColor: theme.colors.canvasWarm,
    borderRadius: HANDLE_CORE_SIZE / 2,
    borderWidth: 3,
    elevation: 4,
    height: HANDLE_CORE_SIZE,
    shadowColor: theme.colors.inkPrimary,
    shadowOffset: {height: 3, width: 3},
    shadowOpacity: 0.85,
    shadowRadius: 0,
    width: HANDLE_CORE_SIZE,
  },
  bottomBar: {
    alignItems: 'center',
    backgroundColor: theme.colors.inkSecondary,
    borderColor: 'rgba(255,248,215,0.25)',
    borderRadius: 22,
    borderWidth: 1,
    bottom: 15,
    flexDirection: 'row',
    gap: 10,
    left: 14,
    padding: 14,
    position: 'absolute',
    right: 14,
  },
  buttonContent: {
    minHeight: 48,
  },
  buttonShadow: {
    borderRadius: theme.radii.sm,
    flex: 1,
    position: 'relative',
  },
  shadowLayer: {
    backgroundColor: theme.colors.darkWorkspace,
    borderRadius: theme.radii.sm,
    bottom: -4,
    left: 4,
    position: 'absolute',
    right: -4,
    top: 4,
  },
  secondaryButtonShadow: {
    backgroundColor: theme.colors.inkSecondary,
  },
  primaryButtonShadow: {
    backgroundColor: theme.colors.actionPrimary,
  },
  secondaryButton: {
    borderColor: 'rgba(255,255,255,0.52)',
    borderRadius: theme.radii.sm,
    flex: 1,
  },
  secondaryLabel: {
    fontSize: theme.typography.button,
    fontWeight: '700',
  },
  primaryButton: {
    borderRadius: theme.radii.sm,
    flex: 1,
  },
  primaryLabel: {
    color: theme.colors.surfaceDefault,
    fontSize: theme.typography.button,
    fontWeight: '800',
  },
});

export default CropScreen;
