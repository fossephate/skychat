import React, { useEffect, useState } from "react"
import { Redirect, router, Slot, SplashScreen, Stack, useRouter, useSegments, usePathname } from "expo-router"
import { observer } from "mobx-react-lite"
import { useInitialRootStore, useStores } from "src/models"
import { useFonts } from "expo-font"
import { customFontsToLoad } from "src/theme"
import { initI18n } from "@/i18n"
import { loadDateFnsLocale } from "@/utils/formatDate"
import { useAppTheme, useThemeProvider } from "@/utils/useAppTheme"

export default observer(function Layout() {

  // useEffect(() => {
  //   // if (isReady) {
  //   //   SplashScreen.hideAsync()
  //   //   if (!user) {
  //   //     router.replace("/welcome")
  //   //   } else {
  //   //     router.replace("/chats")
  //   //   }
  //   // }
  //   SplashScreen.hideAsync()
  //   router.replace("/welcome")
  // }, [])

  const { themeScheme } = useThemeProvider();
  const { themed, theme } = useAppTheme();

  const router = useRouter();
  const pathname = usePathname();

  let bottomBarColor;
  let topBarColor;
  // set bottomBarColor based on the route
  switch (pathname) {
    case "/chats":
    case "/settings":
    case "/contacts":
      bottomBarColor = theme.colors.palette.neutral300;
      topBarColor = theme.colors.background;
      break;
    case "/welcome":
      bottomBarColor = theme.colors.palette.neutral100;
      topBarColor = theme.colors.palette.neutral300;
      break;
    case "/":
      bottomBarColor = "#fff";
      break;
    default:
      topBarColor = theme.colors.background;
      bottomBarColor = "#00000000";
  }

  return <Stack screenOptions={{
    headerShown: false,
    navigationBarColor: bottomBarColor,
    // use transparent background
    // bottomBarColor: "#00000000",
    // safe area on top color:
    statusBarBackgroundColor: topBarColor,
  }} />
})
