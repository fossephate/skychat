const palette = {
  neutral900: "#FFFFFF",
  neutral800: "#F4F2F1",
  neutral700: "#E1E8ED",
  neutral600: "#AAB8C2",
  neutral500: "#657786",
  neutral400: "#38444D",
  neutral300: "#253341",
  neutral200: "#15202B",
  neutral100: "#000000",

  primary600: "#E8F5FD",
  primary500: "#1DA1F2",
  primary400: "#1A91DA",
  primary300: "#1681BF",
  primary200: "#136B9E",
  primary100: "#0F547D",

  // secondary500: "#D9E8F5",
  secondary500: "#1E2936",
  secondary400: "#B3D1E8",
  secondary300: "#8CB9DB",
  secondary200: "#66A2CE",
  secondary100: "#407AB3",

  accent500: "#E8F7FF",
  accent400: "#BFE8FF",
  accent300: "#99D8FF",
  accent200: "#70C9FF",
  accent100: "#47B9FF",

  angry100: "#FFE8EC",
  angry500: "#E0245E",

  overlay20: "rgba(21, 32, 43, 0.2)",
  overlay50: "rgba(21, 32, 43, 0.5)",
} as const

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  text: palette.neutral800,
  textDim: palette.neutral600,
  background: palette.neutral200,
  border: palette.neutral400,
  tint: palette.primary500,
  tintInactive: palette.neutral300,
  separator: palette.neutral300,
  error: palette.angry500,
  errorBackground: palette.angry100,
} as const
