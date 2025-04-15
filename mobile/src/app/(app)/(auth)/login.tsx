import { ViewStyle, TextStyle, Linking, View } from "react-native"
import { Button, Screen, Text, TextField } from "src/components"
import { observer } from "mobx-react-lite"
import { ThemedStyle } from "src/theme"
import { useEffect, useState } from 'react'
import { openAuthSessionAsync } from 'expo-web-browser'
import { useAppTheme } from "@/utils/useAppTheme"

import { router } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"



export default observer(function LoginScreen(_props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const authContext = useAuth();
  const { themed } = useAppTheme();

  // // Set up deep link handling when component mounts
  // useEffect(() => {
  //   const subscription = Linking.addEventListener('url', handleDeepLink);

  //   // Handle deep link when app is opened from background
  //   Linking.getInitialURL().then(url => {
  //     if (url) {
  //       handleDeepLink({ url });
  //     }
  //   });

  //   return () => {
  //     subscription.remove();
  //   };
  // }, []);

  // const handleDeepLink = async (event: { url: string }) => {
  //   console.log("handleDeepLink", event)
  //   if (!event.url) return;
  //   const url = new URL(event.url);
  //   const path = url.pathname;
  //   const queryParams = Object.fromEntries(url.searchParams);
  //   const client = authenticationStore.client

  //   // if (!client) {
  //   //   // don't redirect if client is not initialized:
  //   //   router.replace("/login");
  //   //   return;
  //   // }

  //   // console.log('Received deep link path:', path);
  //   // console.log('Query params:', queryParams);

  //   // if (queryParams.code && queryParams.state && queryParams.iss) {
  //   //   console.log("GOT CODE, STATE, AND ISS");

  //   //   // prevent any redirect from happening with expo router:



  //   //   // const { session, state } = await client.callback(test);

  //   //   // client.callback(test).then(res => {
  //   //   //   console.log("res", res)
  //   //   // })

  //   //   console.log("code", queryParams.code)
  //   //   console.log("state", queryParams.state)
  //   //   // console.log(`logged in as ${session.sub}`)

  //   //   // const redirectParams = `/?session=${queryParams.session}&state=${queryParams.state}`
  //   //   // console.log("redirectParams", redirectParams)

  //   //   // let queryParams2 =
  //   //   //   { "code": "cod-76113ba554588631b6e23079031e46e022b96a0ec4f6eae14cb597342260f877", "error": "Error: Unknown authorization session \"EzbDnn3OX-g8PF-IBk2EbA\"", "iss": "https://bsky.social", "state": "EzbDnn3OX-g8PF-IBk2EbA" };
  //   //   setTimeout(() => {
  //   //     console.log("queryParams", queryParams)
  //   //     router.replace({
  //   //       pathname: '/',
  //   //       params: {
  //   //         code: queryParams.code,
  //   //         state: queryParams.state,
  //   //         iss: queryParams.iss
  //   //       }
  //   //     });
  //   //   }, 1000)
  //   // }
  // };

  const handleLogin = async () => {
    const client = authContext.client

    if (!client) {
      setError("Client not initialized")
      setTimeout(() => setError(""), 3000)
      return
    }

    try {
      let oauthUrl = await client.authorize(username);
      console.log("oauthUrl", oauthUrl)

      const authRes = await openAuthSessionAsync(oauthUrl.toString())
      console.log("authRes", authRes)
      if (authRes.type === 'success') {
        const urlObj = new URL(authRes.url)
        let urlParams = new URLSearchParams();
        urlParams.set("code", urlObj.searchParams.get('code') as string)
        urlParams.set("state", urlObj.searchParams.get('state') as string)
        urlParams.set("iss", urlObj.searchParams.get('iss') as string)
        const { session, state } = await client.callback(urlParams)
        console.log("logged in as", session.sub)
        authContext.setSession(session)
        router.replace("/chats")
      } else {
        throw new Error("Login / OAuth failed")
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("Login failed")
      setTimeout(() => setError(""), 3000)
    }
  }

  return (
    <Screen
      contentContainerStyle={themed($screenContentContainer)}
      safeAreaEdges={["top", "bottom"]}
    >
      <View>

        <Text
          testID="login-heading"
          tx="loginScreen:logIn"
          preset="heading"
          style={themed($signIn)}
        />

        <Text
          tx="loginScreen:enterDetails"
          preset="subheading"
          style={themed($enterDetails)}
        />

        <TextField
          value={username}
          onChangeText={setUsername}
          containerStyle={themed($textField)}
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect={false}
          keyboardType="default"
          // labelTx="loginScreen:usernameFieldLabel"
          placeholderTx="loginScreen:usernameFieldPlaceholder"
          onSubmitEditing={handleLogin}
        />

        {error && (
          <Text
            tx="loginScreen:handleNotFound"
            style={themed($hint)}
          />
        )}
      </View>

      <Button
        testID="send-code-button"
        tx="loginScreen:loginButton"
        style={themed($tapButton)}
        preset="reversed"
        onPress={handleLogin}
      />
    </Screen>
  )
})

const $screenContentContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.xxl,
  paddingHorizontal: spacing.lg,
  flex: 1,
  flexDirection: 'column',
  justifyContent: 'space-between',
})

const $signIn: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.sm,
})

const $enterDetails: ThemedStyle<TextStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
})

const $hint: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.tint,
  marginBottom: spacing.md,
})

const $textField: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
  marginTop: spacing.lg,
  height: 44,
  verticalAlign: 'center',
})

const $tapButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.xs,
})
