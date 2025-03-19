import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  FlatList,
  Image,
  ImageStyle,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native"
import { Screen, Text, ListItem, TextField, Button } from "src/components"
import { useRouter } from "expo-router"
import { router } from "expo-router"
import { Chat, ChatItem, User } from "src/components/Chat/ChatItem"
import { colors, spacing, ThemedStyle } from "src/theme"
import { useAppTheme } from "src/utils/useAppTheme"
import { useConvo } from "@/contexts/ConvoContext"
import { useAuth } from "@/contexts/AuthContext"
import { Agent } from "@atproto/api"
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Generate realistic chats data

// Generate dummy users
const generateUsers = (): User[] => [
  {
    id: "u1",
    displayName: "Alice Smith",
    avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
    online: true,
    verified: false,
  },
  {
    id: "u2",
    displayName: "Bob Johnson",
    avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
    online: false,
    verified: false,
  },
  ...Array(20)
    .fill(null)
    .map((_, index) => ({
      id: `u${index + 3}`,
      displayName: `User ${index + 3}`,
      avatar: `https://i.pravatar.cc/150?u=user${index + 3}${Math.random()}`,
      online: Math.random() > 0.7,
      verified: Math.random() > 0.8,
    })),
]

const SELF_USER: User = {
  id: "self",
  displayName: "You",
  avatar: "https://i.pravatar.cc/150?u=self",
  online: true,
}

export default function chatsScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [chats, setChats] = useState<Chat[]>([])
  const [users] = useState(generateUsers())
  const [composeDrawerOpen, setComposeDrawerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { themed } = useAppTheme()
  const convoContext = useConvo()
  const authContext = useAuth()

  async function fetchDms() {
    console.log("chats.tsx: fetching dms")

    // get bluesky dm ids:
    const { session } = authContext
    if (!session) {
      console.error("No session found")
      return
    }
    const agent = new Agent(session)

    try {
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")
      const response = await proxy.chat.bsky.convo.listConvos()
      const convos = response.data.convos

      // Transform API convos to our chat format
      if (!convos.length) {
        return;
      }

      const transformedChats = await Promise.all(convos.map(async (convo) => {

        // Extract members excluding self
        const memberUsers = convo.members
          .filter((member) => member.did !== session.did)
          .map((member) => ({
            id: member.did,
            displayName: member.displayName || member.handle,
            avatar: member.avatar || `https://i.pravatar.cc/150?u=${member.did}`,
            verified: !!member.verified,
            handle: member.handle,
          }))

        // Include self user for consistency with existing chat model
        const chatMembers = [SELF_USER, ...memberUsers]

        // Extract and decode the last message if available
        const lastMsg = convo.lastMessage
          ? {
            text: convo.lastMessage.text || "New message", // Text might be encrypted
            sender: convo.lastMessage.sender
              ? {
                id: convo.lastMessage.sender.did,
                displayName:
                  convo.lastMessage.sender.displayName || convo.lastMessage.sender.handle,
                avatar:
                  convo.lastMessage.sender.avatar ||
                  `https://i.pravatar.cc/150?u=${convo.lastMessage.sender.did}`,
                online: false,
              }
              : SELF_USER,
            timestamp: formatTimestamp(convo.lastMessage.sentAt),
            read: convo.unreadCount === 0,
          }
          : null

        return {
          id: convo.id,
          name: convo.name || (memberUsers.length === 1 ? memberUsers[0].displayName : ""),
          members: chatMembers,
          lastMessage: lastMsg,
          unreadCount: convo.unreadCount || 0,
          muted: !!convo.muted,
          pinned: false, // API doesn't indicate pinned status
          isBsky: true,
        }
      }))

      setChats(transformedChats as Chat[])
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

  async function fetchChats() {
    console.log("chats.tsx: fetching chats")
    
    // const chats = await convoContext.getChats()
    // setChats(chats)
  }

  // Helper function to format API timestamp to relative time
  function formatTimestamp(timestamp: string) {
    if (!timestamp) return ""

    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) {
      return `${diffMins}m`
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)}h`
    } else {
      return `${Math.floor(diffMins / 1440)}d`
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchDms()
      // Simulate a successful refresh with a small delay
      setTimeout(() => setRefreshing(false), 1000)
    } catch (error) {
      console.error("Error refreshing:", error)
      setRefreshing(false)
    }
  }, [convoContext, authContext])

  useEffect(() => {
    fetchDms()
    fetchChats()
  }, [convoContext, authContext])

  // Create a refreshable empty list component
  const EmptyListComponent = () => (
    <ScrollView
      contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text tx="chatScreen:noChats" preset="bold" />
    </ScrollView>
  )

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screenContainer)}>
      <View style={themed($header)}>
        <Text tx="chatsScreen:title" preset="heading" style={themed($headerText)} />
        {/* <TouchableOpacity style={themed($composeButton)} onPress={() => setComposeDrawerOpen(true)}>
          <Text style={themed($composeIcon)}>✏️</Text>
        </TouchableOpacity> */}
      </View>


      <Button style={themed($invitesBanner)} onPress={() => { router.push("/invites") }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", flex: 1, width: "100%" }}>
          <View style={{ flexDirection: "row" }}>
            <FontAwesome name="envelope" size={24} style={themed($invitesBannerIcon)} />
            <Text tx="chatsScreen:chatRequests" preset="bold" />
          </View>
          <FontAwesome name="chevron-right" size={24} style={themed($invitesBannerIcon)} />
        </View>
      </Button>

      <View style={themed($searchContainer)}>
        <TextField
          style={themed($searchInput)}
          placeholderTx="chatsScreen:searchPlaceholder"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>



      {chats.length > 0 ? (
        <FlatList
          data={chats}
          renderItem={({ item }) => <ChatItem item={item} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={themed($listContent)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      ) : (
        <EmptyListComponent />
      )}
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
  border: "none",
  backgroundColor: colors.palette.neutral700,
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