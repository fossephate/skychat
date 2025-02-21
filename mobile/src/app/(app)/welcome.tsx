import { router } from "expo-router"
import { observer } from "mobx-react-lite"
import React from "react"
import { Image, ImageStyle, TextStyle, View, ViewStyle } from "react-native"
import { Button, Text } from "src/components"
import { isRTL } from "src/i18n"
import { useStores } from "src/models"
import { useHeader } from "src/utils/useHeader"
import { useSafeAreaInsetsStyle } from "src/utils/useSafeAreaInsetsStyle"
import { useAppTheme } from "@/utils/useAppTheme"
import type { ThemedStyle } from "@/theme"

const welcomeLogo = require("assets/images/logo.png")
const welcomeFace = require("assets/images/welcome-face.png")

export default observer(function WelcomeScreen() {
  const {
    authStore: { logout },
  } = useStores()

  const { themed } = useAppTheme()

  function goNext() {
    router.push("/login")
  }

  // useHeader(
  //   {
  //     rightTx: "common:logOut",
  //     onRightPress: logout,
  //   },
  //   [logout],
  // )

  const $bottomContainerInsets = useSafeAreaInsetsStyle(["bottom"])

  return (
    <View style={themed($container)}>
      <View style={themed($topContainer)}>
        <Image style={themed($welcomeLogo)} source={welcomeLogo} resizeMode="contain" />
        <Text
          testID="welcome-heading"
          style={themed($welcomeHeading)}
          tx="welcomeScreen:readyForLaunch"
          preset="heading"
        />
        <Text tx="welcomeScreen:exciting" preset="subheading" />
        <Image style={themed($welcomeFace)} source={welcomeFace} resizeMode="contain" />
      </View>

      <View style={[$bottomContainerInsets, themed($bottomContainer)]}>
        <Text tx="welcomeScreen:postscript" size="md" />
        <Button
          testID="next-screen-button"
          preset="reversed"
          tx="welcomeScreen:letsGo"
          onPress={goNext}
        />
      </View>
    </View>
  )
})

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $topContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexShrink: 1,
  flexGrow: 1,
  flexBasis: "57%",
  justifyContent: "center",
  paddingHorizontal: spacing.lg,
})

const $bottomContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexShrink: 1,
  flexGrow: 0,
  flexBasis: "43%",
  backgroundColor: colors.palette.neutral100,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  paddingHorizontal: spacing.lg,
  justifyContent: "space-around",
})

const $welcomeLogo: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  height: 88,
  width: "100%",
  marginBottom: spacing.xxl,
})

const $welcomeFace: ThemedStyle<ImageStyle> = () => ({
  height: 169,
  width: 269,
  position: "absolute",
  bottom: -47,
  right: -80,
  transform: [{ scaleX: isRTL ? -1 : 1 }],
})

const $welcomeHeading: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.md,
})
