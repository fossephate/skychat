import { router } from "expo-router";
import { Image, ImageStyle, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import { colors, spacing, ThemedStyle } from "@/theme";
import { ListItem } from "src/components/ListItem";
import { Text } from "src/components";
import { useAppTheme } from "@/utils/useAppTheme";

export interface User {
  id: string
  displayName: string
  handle?: string
  avatar?: string
  online: boolean
  description?: string
}

export interface Chat {
  id: string
  members: User[]
  name?: string
  lastMessage?: {
    text: string
    sender: User
    timestamp: string
    read: boolean
  }
  unreadCount: number
  pinned?: boolean
  muted?: boolean
}

const SELF_USER: User = {
  id: "self",
  displayName: "You",
  avatar: "https://i.pravatar.cc/150?u=self",
  online: true,
}

// Helper to get chat name if not explicitly set
const getChatName = (chat: Chat, currentUserId: string): string => {
  if (chat.name) return chat.name

  const otherMembers = chat.members.filter(member => member.id !== currentUserId)
  if (chat.members.length === 2) {
    return otherMembers[0].displayName
  }
  return otherMembers.slice(0, 3).map(m => m.displayName).join(", ")
}

const renderChatAvatar = (chat: Chat) => {
  const { themed } = useAppTheme();
  const isDM = chat.members.length === 2
  const otherMember = chat.members.find(member => member.id !== SELF_USER.id)

  if (isDM && otherMember) {
    return (
      <View style={themed($avatarContainer)}>
        <Image source={{ uri: otherMember.avatar }} style={themed($avatar)} />
        {otherMember.online && <View style={themed($onlineBadge)} />}
      </View>
    )
  } else {
    return (
      <View style={themed($avatarContainer)}>
        <View style={themed($avatar)}>
          <Text style={themed($groupAvatarText)}>
            {chat.name?.[0]?.toUpperCase() || getChatName(chat, SELF_USER.id)[0]}
          </Text>
        </View>
        {!isDM && (
          <View style={themed($memberCount)}>
            <Text style={themed($memberCountText)}>{chat.members.length}</Text>
          </View>
        )}
      </View>
    )
  }
}

// const lastMessage = (chat: Chat) => {
//   {chat.lastMessage && (
//     <View style={$messageContainer}>
//       <Text
//         style={[
//           $messageText,
//           !chat.lastMessage.read && $unreadMessageText,
//           chat.muted && $mutedText,
//         ]}
//         numberOfLines={1}
//       >
//         {chat.members.length > 2 && (
//           <Text style={$senderName}>{chat.lastMessage.sender.name}: </Text>
//         )}
//         {chat.lastMessage.text}
//       </Text>
//     </View>
//   )}
// }

// Convert to a proper React component
const ChatItem = ({ item: chat }: { item: Chat }) => {
  const { themed } = useAppTheme();
  return (
    <View style={[themed($chatCard), chat.pinned && themed($pinnedChat)]}>
      <ListItem
        LeftComponent={renderChatAvatar(chat)}
        text={getChatName(chat, SELF_USER.id)}
        textStyle={[
          themed($chatName),
          !chat.lastMessage?.read && themed($unreadChatName),
        ]}
        onPress={() => {
          console.log("chatName", chat.id)
          const chatName = getChatName(chat, SELF_USER.id)
          router.push(`/chats/${chat.id}` as any)
        }}
        RightComponent={
          <View style={themed($rightContainer)}>
            <Text style={[
              themed($timestamp),
              !chat.lastMessage?.read && themed($unreadTimestamp),
              chat.muted && themed($mutedText),
            ]}>
              {chat.lastMessage?.timestamp}
            </Text>
            {chat.unreadCount > 0 && (
              <View style={[themed($unreadBadge), chat.muted && themed($mutedBadge)]}>
                <Text style={themed($unreadText)}>{chat.unreadCount}</Text>
              </View>
            )}
            {chat.muted && <Text style={themed($mutedIcon)}>🔇</Text>}
            {chat.pinned && <Text style={themed($pinnedIcon)}>📌</Text>}
          </View>
        }
        style={themed($listItem)}
      />
    </View>
  );
};

// Export the component instead of the render function
export { ChatItem };

const $onlineBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  bottom: 0,
  right: 0,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: "#4CAF50",
  borderWidth: 2,
  borderColor: colors.background,
})

const $verifiedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  bottom: -2,
  right: -2,
  backgroundColor: colors.palette.primary500,
  borderRadius: 10,
  width: 20,
  height: 20,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 2,
  borderColor: colors.background,
})

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

const $headerText: ThemedStyle<TextStyle> = () => ({
  fontSize: 32,
})

const $composeButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: colors.palette.primary100,
  justifyContent: "center",
  alignItems: "center",
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

const $listItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
})

const $avatarContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "relative",
  marginRight: spacing.sm,
})

const $avatar: ThemedStyle<ViewStyle> = () => ({
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

const $chatName: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  marginBottom: 2,
})

const $unreadChatName: ThemedStyle<TextStyle> = () => ({
  fontWeight: "bold",
})

const $messageContainer: ThemedStyle<ViewStyle> = () => ({
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

const $senderName: ThemedStyle<TextStyle> = () => ({
  fontWeight: "bold",
})

const $rightContainer: ThemedStyle<ViewStyle> = () => ({
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

const $mutedIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 12,
  marginTop: spacing.xs,
})

const $pinnedIcon: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 12,
  marginTop: spacing.xs,
})

const $modalOverlay: ThemedStyle<ViewStyle> = () => ({
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

const $drawerContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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

const $drawerTitle: ThemedStyle<TextStyle> = () => ({
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

const $userSelectItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.sm,
})

const $checkboxContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
})

const $checkbox: ThemedStyle<ViewStyle> = ({ colors }) => ({
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

const $selectAvatar: ThemedStyle<ImageStyle> = ({ spacing }) => ({
  width: 40,
  height: 40,
  borderRadius: 20,
  marginRight: spacing.sm,
})

const $userInfo: ThemedStyle<ViewStyle> = () => ({
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
})

const $userName: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 16,
  marginRight: spacing.xs,
})

const $verifiedBadgeSmall: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
  fontSize: 14,
})

const $drawerScroll: ThemedStyle<ViewStyle> = () => ({
  maxHeight: 400,
})