import React from "react"
import {
  ViewStyle,
  TextStyle,
} from "react-native"
import { Screen, Header } from "@/components"
import { useAppTheme } from "@/utils/useAppTheme"
import { translate } from "@/i18n"
import { ThemedStyle } from "@/theme"
import { useAuth } from "@/contexts/AuthContext"
import { Agent } from "@atproto/api"
import { router } from "expo-router"
import { ChatRequestsList } from "skychat-lib"


export default function InvitesScreen() {
  const { themed } = useAppTheme()

  const { session } = useAuth()

  if (!session) {
    console.error("No session found")
    router.push("/login")
    return <></>
  }

  const agent = new Agent(session)

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screenContainer)}>
      {/* <View style={themed($header)}>
        <Text tx="invitesScreen:title" preset="heading" style={themed($headerText)} />
      </View> */}
      <Header
        title={translate("chatRequestsScreen:title")}
        leftIcon="back"
        leftIconColor={themed($headerText).color?.toString()}
        onLeftPress={() => router.back()}
      />

      <ChatRequestsList
        agent={agent as any}
        onChatPress={(chat) => {
          if (chat.isBsky) {
            router.push(`/bskychats/${chat.id}` as any)
          }
        }}
        onInvitesPress={() => {}}
        showInvitesBanner={false}
        onProfilePress={(chat) => {
          console.log("onProfilePress", chat)
        }}
      />
    </Screen>
  )
}

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 32,
  color: colors.text,
})