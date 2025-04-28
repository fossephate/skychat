import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  RefreshControl,
  SectionList,
} from "react-native"
import { Screen, Text, Button } from "src/components"
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
      <View style={themed($header)}>
        <Text tx="chatsScreen:title" preset="heading" style={themed($headerText)} />
        {/* <TouchableOpacity style={themed($composeButton)} onPress={() => setComposeDrawerOpen(true)}>
          <Text style={themed($composeIcon)}>✏️</Text>
        </TouchableOpacity> */}
      </View>
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

const $invitesBanner: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  marginBottom: spacing.md,
  // border: 0,
  backgroundColor: colors.palette.secondary400,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
})

const $invitesBannerIcon: ThemedStyle<TextStyle> = ({ colors }) => ({
  marginRight: spacing.sm,
  color: colors.text,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
})

const $sectionHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
})

const $sectionHeaderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  color: colors.text,
})

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 32,
  color: colors.text,
})

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
})

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  height: 40,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.text,
  textAlignVertical: "center",
})

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
  flexGrow: 1, // Ensure it fills the space for proper pull to refresh
})