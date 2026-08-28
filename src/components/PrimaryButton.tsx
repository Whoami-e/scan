/**
 * 扫描主流程按钮的最小可复用组件。
 *
 * 按钮只处理视觉和可访问性，不在组件内部触发相机、存储或导航。
 * 这样“按钮长什么样”和“点击后做什么”保持分离，后续替换导航方案时更容易。
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableStateCallbackType,
} from 'react-native';

import {theme} from '../theme/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: PrimaryButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={(state: PressableStateCallbackType) => [
        styles.button,
        state.pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: theme.colors.actionPrimary,
    borderRadius: theme.radii.md,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  buttonPressed: {
    backgroundColor: theme.colors.actionPressed,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  label: {
    color: theme.colors.surfaceDefault,
    fontSize: theme.typography.button,
    fontWeight: '700',
  },
});

export default PrimaryButton;
