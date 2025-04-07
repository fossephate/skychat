import { router } from "expo-router";
import { Image, ImageStyle, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";
import { ThemedStyle } from "@/theme";
import { ListItem } from "src/components/ListItem";
import { Text } from "src/components";
import { useAppTheme } from "@/utils/useAppTheme";
import { useConvo } from "@/contexts/ConvoContext";

export interface User {
  id: string
  displayName: string
  handle?: string
  avatar?: string
  description?: string
}

export interface Chat {
  id: string
  isBsky: boolean
  members: User[]
  name?: string
  handle?: string
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

const renderChatAvatar = (chat: Chat) => {
  const { themed } = useAppTheme();
  const convoContext = useConvo()
  const client = convoContext.client
  const ownId = client?.id;
  const isDM = chat.members.length = 2

  var selfMember = null;
  var otherMember = null;
  for (const member of chat.members) {
    if (member?.id === ownId) {
      selfMember = member;
    } else {
      otherMember = member;
    }
  }

  if (isDM && otherMember) {
    return (
      <View style={themed($avatarContainer)}>
        <Image source={{ uri: otherMember.avatar }} style={themed($avatar)} />
      </View>
    )
  }
  
  return (
    <View style={themed($avatarContainer)}>
      {/* <View style={themed($avatar)}>
        <Text style={themed($groupAvatarText)}>
          {chat.name?.[0]?.toUpperCase() || getChatName(chat, SELF_USER.id)[0]}
        </Text>
      </View> */}
      <Image source={{ uri: selfMember?.avatar || "https://i.pravatar.cc/150?u=self" }} style={themed($avatar)} />
      {!isDM && (
        <View style={themed($memberCount)}>
          <Text style={themed($memberCountText)}>{chat.members.length}</Text>
        </View>
      )}
    </View>
  )

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
        textStyle={[
          themed($chatName),
          !chat.lastMessage?.read && themed($unreadChatName),
        ]}
        onPress={() => {
          if (chat.isBsky) {
            router.push(`/bskychats/${chat.id}` as any)
          } else {
            router.push(`/chats/${chat.id}` as any)
          }
        }}

        RightComponent={
          <View style={themed($rightContainer)}>
            <Text style={[
              themed($timestamp),
              // !chat.lastMessage?.read && themed($unreadTimestamp),
              // chat.muted && themed($mutedText),
            ]}>
              {chat.lastMessage?.timestamp}
            </Text>
            {chat.unreadCount > 0 && (
              <View style={[themed($unreadBadge), chat.muted && themed($mutedBadge)]}>
                <Text style={themed($unreadText)}>{chat.unreadCount}</Text>
              </View>
            )}
            {/* {chat.muted && <Text style={themed($mutedIcon)}>🔇</Text>} */}
            {/* {chat.pinned && <Text style={themed($pinnedIcon)}>📌</Text>} */}
          </View>
        }
        style={themed($listItem)}
      >
        <View style={{ flexDirection: "column" }}>
          <Text>{chat.name}</Text>
          {chat.handle && <Text style={themed($chatHandle)}>{"@" + chat.handle}</Text>}
          {chat.lastMessage && (
            <Text numberOfLines={1} style={themed($lastMessage)}>{chat.lastMessage?.text}</Text>
          )}
        </View>
      </ListItem>

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

const $lastMessage: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  // color: colors.palette.neutral600,
  color: colors.text,
  // marginTop: spacing.xs,
  textOverflow: "ellipsis",
  overflow: "hidden",
  // marginBottom: spacing.xs,
  // maxWidth: 240,
})

const $chatHandle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.palette.neutral600,
})

const $chatCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  // backgroundColor: colors.palette.neutral100,
  // marginBottom: spacing.sm,
  borderRadius: 16,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  // elevation: 3,
})

const $pinnedChat: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderLeftWidth: 3,
  borderLeftColor: colors.palette.primary500,
})

const $listItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
})

const $avatarContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: "relative",
  marginRight: spacing.sm,
  paddingTop: spacing.sm,
})

const $avatar: ThemedStyle<ViewStyle> = () => ({
  width: 48,
  height: 48,
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

const $rightContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: "flex-end",
})

const $timestamp: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xs,
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