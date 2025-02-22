import React, { useState } from "react"
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
  ScrollView
} from "react-native"
import { Screen, Text, ListItem, TextField } from "src/components"
import { useRouter } from "expo-router"
import { router } from "expo-router"
import { Chat, ChatItem, User } from "src/components/Chat/ChatItem"
import { colors, spacing, ThemedStyle } from "src/theme"
import { useAppTheme } from "src/utils/useAppTheme"
import { useStores } from "@/models/helpers/useStores"


const UserSelectDrawer = ({ isVisible, onClose, users }: {
  isVisible: boolean
  onClose: () => void
  users: User[]
}) => {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const { themed } = useAppTheme()

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={themed($modalOverlay)}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={themed($drawerContainer)}>
          <TouchableOpacity activeOpacity={1}>
            <View style={themed($drawerContent)}>
              <View style={themed($drawerHeader)}>
                <Text style={themed($drawerTitle)}>New Chat</Text>
                <TouchableOpacity
                  style={themed($createButton)}
                  onPress={() => {
                    console.log("Selected users:", Array.from(selectedUsers))
                    onClose()
                  }}
                >
                  <Text style={themed($createButtonText)}>Create</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={themed($drawerScroll)}>
                {users.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={themed($userSelectItem)}
                    onPress={() => toggleUser(user.id)}
                  >
                    <View style={themed($checkboxContainer)}>
                      <View style={[
                        themed($checkbox),
                        selectedUsers.has(user.id) && themed($checkboxSelected)
                      ]}>
                        {selectedUsers.has(user.id) && (
                          <Text style={themed($checkmark)}>✓</Text>
                        )}
                      </View>
                    </View>
                    <Image source={{ uri: user.avatar }} style={themed($selectAvatar)} />
                    <View style={themed($userInfo)}>
                      <Text style={themed($userName)}>{user.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}



// Generate realistic chats data
const generateChats = (): Chat[] => {
  const users = generateUsers()

  const group_names = ["Design Team", "Marketing Team", "Engineering Team", "Product Team", "Sales Team", "Support Team", "Finance Team", "HR Team", "Legal Team", "IT Team"]

  const chats: Chat[] = [
    {
      id: "dm1",
      members: [SELF_USER, users[1]],
      lastMessage: {
        text: "Looking forward to our meeting tomorrow! 📅",
        sender: users[1],
        timestamp: "2m",
        read: false,
      },
      unreadCount: 0,
      pinned: true,
    },
    {
      id: "g1",
      name: "Design Team",
      members: [SELF_USER, ...users.slice(0, 4)],
      lastMessage: {
        text: "Just shared the latest mockups for review",
        sender: users[1],
        timestamp: "15m",
        read: true,
      },
      unreadCount: 0,
      pinned: true,
    },
    ...Array(20).fill(null).map((_, index) => {
      const chatMembers = [SELF_USER];
      const numUsers = Math.floor(Math.random() * 5) + 1
      // get a random selection of users:
      const randomUsers = users.sort(() => Math.random() - 0.5).slice(0, numUsers)
      chatMembers.push(...randomUsers)

      const lastMessageSender = chatMembers[Math.floor(Math.random() * chatMembers.length)]

      const group_name = numUsers == 2 ? group_names[index % group_names.length] : "";

      return {
        id: `chat-${index}`,
        name: group_name,
        members: chatMembers,
        lastMessage: {
          text: `Message ${index}`,
          sender: lastMessageSender,
          timestamp: `${Math.floor(Math.random() * 59)}m`,
          read: Math.random() > 0.3,
        },
        unreadCount: Math.random() > 0.7 ? Math.floor(Math.random() * 5) + 1 : 0,
        muted: Math.random() > 0.8,
      }
    }),
  ]

  return chats.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return 0
  })
}

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
  ...Array(20).fill(null).map((_, index) => ({
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
  const [chats] = useState(generateChats())
  const [users] = useState(generateUsers())
  const [composeDrawerOpen, setComposeDrawerOpen] = useState(false)
  const router = useRouter()
  const { themed } = useAppTheme()
  const { convoStore } = useStores();

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screenContainer)}>
      <View style={themed($header)}>
        <Text tx="chatsScreen:title" preset="heading" style={themed($headerText)} />
        <TouchableOpacity
          style={themed($composeButton)}
          onPress={() => setComposeDrawerOpen(true)}
        >
          <Text style={themed($composeIcon)}>✏️</Text>
        </TouchableOpacity>
      </View>

      <View style={themed($searchContainer)}>
        <TextField
          style={themed($searchInput)}
          placeholderTx="chatsScreen:searchPlaceholder"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={chats}
        renderItem={({ item }) => <ChatItem item={item} />}
        keyExtractor={(item) => item.id}
        contentContainerStyle={themed($listContent)}
        showsVerticalScrollIndicator={false}
      />

      <UserSelectDrawer
        isVisible={composeDrawerOpen}
        onClose={() => setComposeDrawerOpen(false)}
        users={users.filter(user => user.id !== SELF_USER.id)}
      />
    </Screen>
  )
}

// Styles
const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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

const $composeButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.palette.primary100,
  justifyContent: "center",
  alignItems: "center",
})

const $composeIcon: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  color: colors.text,
})

const $searchContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
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
  textAlignVertical: 'center',
})

const $listContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.lg,
})

const $chatCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  marginBottom: spacing.sm,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3,
})

const $pinnedChat: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderLeftWidth: 3,
  borderLeftColor: colors.palette.primary500,
})

const $listItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
})

const $avatarContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "relative",
  marginRight: spacing.sm,
})

const $avatar: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  width: 50,
  height: 50,
  borderRadius: 25,
})

const $groupAvatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.secondary300,
  justifyContent: "center",
  alignItems: "center",
})

const $groupAvatarText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 20,
  fontWeight: "bold",
})

const $memberCount: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  bottom: -2,
  right: -2,
  backgroundColor: colors.palette.secondary500,
  width: 24,
  height: 24,
  borderRadius: 12,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 2,
  borderColor: colors.background,
})

const $memberCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 11,
  fontWeight: "bold",
  justifyContent: "center",
  alignItems: "center",
  position: "absolute",
})

const $chatName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 16,
  marginBottom: 2,
  color: colors.text,
})

const $unreadChatName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: "bold",
  color: colors.text,
})

const $messageContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: "row",
  alignItems: "center",
})

const $messageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.palette.neutral600,
  flex: 1,
})

const $unreadMessageText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  fontWeight: "500",
})

const $mutedText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.neutral600,
  opacity: 0.6,
})

const $senderName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontWeight: "bold",
  color: colors.text,
})

const $rightContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  alignItems: "flex-end",
})

const $timestamp: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xs,
})

const $unreadTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
  fontWeight: "500",
})

const $unreadBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  minWidth: 24,
  height: 24,
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 4,
})

const $mutedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral600,
  opacity: 0.6,
})

const $unreadText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 13,
  fontWeight: "bold",
})

const $mutedIcon: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  marginTop: spacing.xs,
})

const $pinnedIcon: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  marginTop: spacing.xs,
})

const $modalOverlay: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  justifyContent: "flex-end",
})

const $drawerContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.background,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: "80%",
})

const $drawerContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.md,
})

const $drawerHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral200,
})

const $drawerTitle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
})

const $createButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.primary500,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 16,
})

const $createButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontWeight: "bold",
})

const $userList: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingTop: spacing.sm,
})

const $userSelectItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
})

const $checkboxContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginRight: spacing.sm,
})

const $checkbox: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.palette.neutral400,
  justifyContent: "center",
  alignItems: "center",
})

const $checkboxSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
  borderColor: colors.palette.primary500,
})

const $checkmark: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 14,
  fontWeight: "bold",
})

const $selectAvatar: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: spacing.sm,
})

const $userInfo: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
})

const $userName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  marginRight: spacing.xs,
})

const $verifiedBadgeSmall: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
  fontSize: 14,
})

const $drawerScroll: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  maxHeight: 400,
})
