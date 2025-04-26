// app/_layout.tsx
import React, { useEffect, useState } from "react"
import { SplashScreen, Stack } from "expo-router"
import { initI18n } from "@/i18n"
import { customFontsToLoad } from "@/theme"
import { loadDateFnsLocale } from "@/utils/formatDate"
import { useThemeProvider } from "@/utils/useAppTheme"
import { useFonts } from "expo-font"
import { AppProvider } from "@/contexts/AppProvider"
import { AppInitializer } from "@/components/AppInitializer"

SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  // Load Reactotron configuration in development. We don't want to
  // include this in our production bundle, so we are using `if (__DEV__)`
  // to only execute this in development.
  require("src/devtools/ReactotronConfig.ts")
}

export { ErrorBoundary } from "src/components/ErrorBoundary/ErrorBoundary"

export default function Root() {
  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const { themeScheme, setThemeContextOverride, ThemeProvider } = useThemeProvider()

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])

  const loaded = fontsLoaded && isI18nInitialized

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  if (!loaded) {
    return null
  }

  return (
    <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
      <AppProvider loaded={loaded}>
        <AppInitializer />
        <Stack screenOptions={{ headerShown: false }} />
      </AppProvider>
    </ThemeProvider>
  )
}
