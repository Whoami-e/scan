/**
 * 扫描主流程按钮的最小可复用组件。
 *
 * 按钮只处理视觉和可访问性，不在组件内部触发相机、存储或导航。
 * 这样“按钮长什么样”和“点击后做什么”保持分离，后续替换导航方案时更容易。
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Button} from 'react-native-paper';

import {theme} from '../theme/theme';

interface PrimaryButtonProps {
  accessibilityLabel?: string;
  icon?: React.ComponentProps<typeof Button>['icon'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function PrimaryButton({
  accessibilityLabel,
  icon,
  label,
  onPress,
  disabled = false,
}: PrimaryButtonProps): React.JSX.Element {
  return (
    <View style={styles.wrapper}>
      <View
        pointerEvents="none"
        style={[styles.shadowLayer, disabled && styles.shadowLayerDisabled]}
      />
      <Button
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{disabled}}
        buttonColor={theme.colors.actionPrimary}
        disabled={disabled}
        icon={icon}
        mode="contained"
        onPress={onPress}
        style={[styles.button, disabled && styles.buttonDisabled]}
        contentStyle={styles.content}
        labelStyle={styles.label}
        uppercase={false}>
        {label}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    width: '100%',
  },
  shadowLayer: {
    backgroundColor: theme.colors.inkPrimary,
    borderRadius: theme.radii.md,
    bottom: -7,
    left: 7,
    position: 'absolute',
    right: -7,
    top: 7,
  },
  shadowLayerDisabled: {
    opacity: 0.45,
  },
  button: {
    borderRadius: theme.radii.md,
    elevation: 4,
    shadowColor: theme.colors.inkPrimary,
    shadowOffset: {height: 4, width: 4},
    shadowOpacity: 1,
    shadowRadius: 0,
    width: '100%',
  },
  content: {
    minHeight: 48,
    paddingHorizontal: 0,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: theme.typography.button,
    fontWeight: '800',
  },
});

export default PrimaryButton;
