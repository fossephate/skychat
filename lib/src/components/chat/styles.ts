
import { ThemedStyle } from "../../theme";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export const $avatarContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // height: '100%',
  height: 80,
  alignItems: 'center',
  justifyContent: 'center',
});

export const $avatar: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral300,
  marginRight: spacing.md,
  justifyContent: 'center',
  marginTop: 'auto',
  marginBottom: 'auto',
});


export const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginLeft: spacing.sm,
});

export const $userName: ThemedStyle<TextStyle> = ({ spacing, colors }) => ({
  fontSize: 15,
  fontWeight: '600',
  marginRight: spacing.xs,
  color: colors.text,
});

export const $userHandle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.palette.neutral600,
});

export const $userStatus: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 1,
});

export const $userStatusError: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.error,
  marginTop: 1,
});