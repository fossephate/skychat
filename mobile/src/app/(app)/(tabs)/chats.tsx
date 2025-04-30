import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  RefreshControl,
  SectionList,
} from "react-native"
import { Screen, Text, Button, Header } from "src/components"
import { router } from "expo-router"
import { ChatList, Chat, User, useConvo } from "skychat-lib"
import { colors, spacing, ThemedStyle } from "src/theme"
import { useAppTheme } from "src/utils/useAppTheme"
import { useAuth } from "@/contexts/AuthContext"
import { Agent } from "@atproto/api"

export default function chatsScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [bskychats, setBskychats] = useState<Chat[]>([])
  const [skychats, setSkychats] = useState<Chat[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { themed } = useAppTheme()
  const convoContext = useConvo()
  const { session } = useAuth()

  if (!session) {
    console.error("No session found")
    router.push("/login")
    return <></>
  }

  const agent = new Agent(session)

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screenContainer)}>
      <Header titleTx="chatsScreen:title" safeAreaEdges={[]} rightIcon="more" onRightPress={() => {
        router.push("/settings")
      }}/>
      <ChatList
        agent={agent}
        onChatPress={(chat) => {
          console.log('chat: ', chat);
          if (chat.isBsky) {
            router.push(`/bskychats/${chat.id}` as any)
          } else {
            router.push(`/chats/${chat.id}` as any)
          }
        }}
        onInvitesPress={() => {
          router.push("/invites")
        }}
        onProfilePress={(id) => {
          router.push(`/profile/${id}` as any)
        }}
        refreshInterval={10000}
      />
    </Screen>
  )
}

// Styles
const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
})


const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 32,
  color: colors.text,
})