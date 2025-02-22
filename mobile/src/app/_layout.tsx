// app/_layout.tsx
import React, { useEffect, useState } from "react"
import { router, Slot, SplashScreen, Stack } from "expo-router"
import { useInitialRootStore, useStores } from "src/models"
import { initI18n } from "@/i18n";
import { customFontsToLoad } from "@/theme";
import { loadDateFnsLocale } from "@/utils/formatDate";
import { useThemeProvider } from "@/utils/useAppTheme";
import { useFonts } from "expo-font";
import { OAuthSession, ReactNativeOAuthClient, TokenInvalidError, TokenRefreshError, TokenRevokedError } from "@aquareum/atproto-oauth-client-react-native"
import { AUTH_SERVER_URL, SKYCHAT_SERVER_URL } from "@/env";



SplashScreen.preventAutoHideAsync()

if (__DEV__) {
  // Load Reactotron configuration in development. We don't want to
  // include this in our production bundle, so we are using `if (__DEV__)`
  // to only execute this in development.
  require("src/devtools/ReactotronConfig.ts")
}

export { ErrorBoundary } from "src/components/ErrorBoundary/ErrorBoundary"

export default function Root() {
  // Wait for stores to load and render our layout inside of it so we have access
  const { rehydrated } = useInitialRootStore()

  const [fontsLoaded, fontError] = useFonts(customFontsToLoad)
  const [isI18nInitialized, setIsI18nInitialized] = useState(false)
  const { themeScheme, setThemeContextOverride, ThemeProvider } = useThemeProvider()
  const { authStore, convoStore } = useStores()

  useEffect(() => {
    initI18n()
      .then(() => setIsI18nInitialized(true))
      .then(() => loadDateFnsLocale())
  }, [])


  const loaded = fontsLoaded && isI18nInitialized && rehydrated

  useEffect(() => {
    if (fontError) throw fontError
  }, [fontError])

  useEffect(() => {
    (async () => {
      if (loaded) {
        SplashScreen.hideAsync()

        let authClient = new ReactNativeOAuthClient({
          clientMetadata: {
            "redirect_uris": [
              `${AUTH_SERVER_URL}/oauth/callback`
            ],
            "response_types": [
              "code"
            ],
            "grant_types": [
              "authorization_code",
              "refresh_token"
            ],
            "scope": "atproto transition:generic transition:chat.bsky",
            "token_endpoint_auth_method": "none",
            "application_type": "web",
            "client_id": `${AUTH_SERVER_URL}/client-metadata.json`,
            "client_name": "AT Protocol Express App",
            "client_uri": AUTH_SERVER_URL,
            "dpop_bound_access_tokens": true,
          },
          handleResolver: 'https://bsky.social'
        });

        console.log("initializing client");
        authStore.setClient(authClient)

        const result = await authClient.init();
        console.log("client init results:", result);

        authClient.addEventListener(
          'deleted',
          (
            event: CustomEvent<{
              sub: string
              cause: TokenRefreshError | TokenRevokedError | TokenInvalidError | unknown
            }>,
          ) => {
            const { sub, cause } = event.detail
            console.error(`Session for ${sub} is no longer available (cause: ${cause})`)
            authStore.setDidAuthenticate(false);
            router.replace("/welcome" as any)
          },
        )



        if (result) {
          const { session } = result
          if ('state' in result && result.state != null) {
            console.log(
              `${session.sub} was successfully authenticated (state: ${result.state})`,
            )
          } else {
            console.log(`${session.sub} was restored (last active session)`)
          }
          authStore.setDidAuthenticate(true)
          authStore.setSession(session)

          let userId = session.sub

          // initialize the convo client
          console.log("initializing convo client");
          try {
            convoStore.initClient(userId);
            await convoStore.connect(SKYCHAT_SERVER_URL);
          } catch (e) {
            // console.error("Failed to connect to convo server", e);
          }
          
          if (convoStore.isConnected) {
            router.replace("/chats")
          } else {
            // TODO: handle this better: ¯\_(ツ)_/¯
            router.replace("/error" as any)
          }
        } else {
          router.replace("/welcome" as any)
        }
      }
    })()
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );

}
