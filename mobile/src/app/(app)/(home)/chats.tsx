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
  SectionList,
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
}

export default function chatsScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [bskychats, setBskychats] = useState<Chat[]>([])
  const [skychats, setSkychats] = useState<Chat[]>([])
  const [users] = useState(generateUsers())
  const [composeDrawerOpen, setComposeDrawerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { themed } = useAppTheme()
  const convoContext = useConvo()
  const authContext = useAuth()
  // const [memberProfiles, setMemberProfiles] = useState<Map<string, User>>(new Map())

  let memberProfiles = new Map<string, User>();


  async function fetchUserProfile(did: string): Promise<User> {
    const { session } = authContext

    if (memberProfiles.has(did)) {
      return memberProfiles.get(did) as User;
    }

    if (!session) {
      console.error("No session found")
      return {
        id: did,
        displayName: did,
        avatar: `https://i.pravatar.cc/150?u=${did}`,
      }
    }

    try {
      const agent = new Agent(session)
      const profile = await agent.getProfile({ actor: did })
      const userProfile = {
        id: did,
        displayName: profile.data.displayName || did.substring(0, 8) + '...',
        avatar: profile.data.avatar,
      }
      memberProfiles.set(did, userProfile);
      return userProfile;
    } catch (error) {
      console.error(`Error fetching profile for ${did}:`, error)
      const userProfile = {
        id: did,
        displayName: did.substring(0, 8) + '...',
        avatar: `https://i.pravatar.cc/150?u=${did}`,
      }
      memberProfiles.set(did, userProfile);
      return userProfile;
    }
  }

  async function fetchBskychats() {
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
          .map((member) => ({
            id: member.did,
            displayName: member.displayName || member.handle,
            avatar: member.avatar,
            verified: !!member.verified,
            handle: member.handle,
          }))

        for (const member of memberUsers) {
          if (!memberProfiles.has(member.id)) {
            memberProfiles.set(member.id, {
              id: member.id,
              displayName: member.displayName || member.handle,
              avatar: member.avatar,
              handle: member.handle,
            });
          }
        }

        let handle;
        let name;
        for (const member of memberUsers) {
          if (member.id !== convoContext.client?.id) {
            handle = member.handle;
            name = member.displayName;
            break;
          }
        }

        return {
          id: convo.id,
          name: name,
          handle: handle,
          members: memberUsers,
          lastMessage: convo.lastMessage,
          unreadCount: convo.unreadCount || 0,
          isBsky: true,
        }
      }))

      setBskychats(transformedChats as Chat[])
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }



  async function fetchSkychats() {
    console.log("chats.tsx: fetching skychats")

    let chats = [];
    // Fetch chats with proper error handling
    try {
      chats = await convoContext.getChats();
    } catch (error) {
      console.error("Error fetching skychats:", error);
      return;
    }

    // map skychat chats for display:
    // const transformedChats = await Promise.all(chats.map(async (chat) => {

    //   let members = [];

    //   for (const memberId of chat.members) {
    //     var userProfile = memberProfiles.get(memberId);

    //     if (!userProfile) {
    //       userProfile = await fetchUserProfile(memberId);
    //       memberProfiles.set(memberId, userProfile);
    //     }

    //     if (userProfile) {
    //       members.push(userProfile);
    //     }
    //   }

    //   for (const member of members) {
    //     console.log("member", member)
    //   }
    //   console.log("members", members)

    //   return {
    //     id: Buffer.from(chat.id).toString('base64'),
    //     name: chat.name,
    //     members: members,
    //     isBsky: false,
    //   };
    // }));


    let transformedChats = [];

    // for k, v in chats
    for (const chat of chats) {
      console.log("chat", chat)

      let members = [];

      // technically this is an error state but might as well handle it gracefullyish:
      if (chat.members.length < 2) {
        const id = convoContext.client?.id;
        if (id) {
          const userProfile = await fetchUserProfile(id);
          members.push(userProfile);
          members.push(userProfile);
        } else {
          // add mock members just so the ui doesn't break:
          members.push({
            id: id,
            displayName: "You",
            avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
          });
          members.push({
            id: "self",
            displayName: "You",
            avatar: `https://i.pravatar.cc/150?u=${Math.random()}`,
          });
        }
      }


      for (const memberId of chat.members) {
        var userProfile = memberProfiles.get(memberId);

        // if (memberId === convoContext.client?.id) {
        //   continue;
        // }

        if (!userProfile) {
          userProfile = await fetchUserProfile(memberId);
        }

        if (userProfile) {
          members.push(userProfile);
        }
      }


      let handle;
      let name;
      for (const member of members) {
        if (member.id !== convoContext.client?.id) {
          // handle = member.displayName;
          name = member.displayName;
          break;
        }
      }

      transformedChats.push({
        id: Buffer.from(chat.id).toString('base64'),
        name: chat.name,
        members: members,
        isBsky: false,
        unreadCount: 0,
      });
    }

    setSkychats(transformedChats as Chat[]);
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
      await Promise.all([fetchBskychats(), fetchSkychats()])
      // Simulate a successful refresh with a small delay
      setTimeout(() => setRefreshing(false), 1000)
    } catch (error) {
      console.error("Error refreshing:", error)
      setRefreshing(false)
    }
  }, [convoContext, authContext])

  useEffect(() => {
    fetchBskychats()
    fetchSkychats()
  }, [convoContext, authContext])

  // Filter chats based on search query
  const filteredBskyChats = searchQuery
    ? bskychats.filter(chat =>
      chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage?.text.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : bskychats

  const filteredSkyChats = searchQuery
    ? skychats.filter(chat =>
      chat.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage?.text?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : skychats

  // Create sections for the SectionList
  const sections = [
    { title: 'Skychats', data: filteredSkyChats, type: 'sky' },
    { title: 'Bsky DMs', data: filteredBskyChats, type: 'bsky' },
  ].filter(section => section.data.length > 0) // Only include sections with data

  // Render the section header
  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={themed($sectionHeader)}>
      <Text preset="bold" style={themed($sectionHeaderText)}>{section.title}</Text>
    </View>
  )

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

      {/* <View style={themed($searchContainer)}>
        <TextField
          style={themed($searchInput)}
          placeholderTx="chatsScreen:searchPlaceholder"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View> */}

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          renderItem={({ item }) => <ChatItem item={item} />}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={themed($listContent)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          stickySectionHeadersEnabled={true}
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