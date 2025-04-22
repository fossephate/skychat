import {
  Image,
  TextStyle,
  View,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { useRef } from 'react';
import { ThemedStyle } from '../../theme';
import { ListItem } from '../../components/ListItem';
import { Text, Button } from '../../components';
import { useAppTheme } from '../../utils/useAppTheme';
import { useConvo } from '../../contexts/ConvoContext';
import Swipeable, { SwipeableRef } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

export interface User {
  id: string;
  displayName: string;
  handle?: string;
  avatar?: string;
  description?: string;
}

export interface Chat {
  id: string;
  isBsky: boolean;
  members: User[];
  name?: string;
  handle?: string;
  lastMessage?: {
    text: string;
    sender: User;
    timestamp: string;
    read: boolean;
  };
  unreadCount: number;
  pinned?: boolean;
  muted?: boolean;
}

const avatarStyle = {
  width: 48,
  height: 48,
  borderRadius: 25,
};

const renderChatAvatar = (chat: Chat, onProfilePress?: (chat: Chat) => void) => {
  const { themed } = useAppTheme();
  const convoContext = useConvo();
  const client = convoContext?.client;
  const ownId = client?.id;
  const isDM = (chat.members.length = 2);

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
        <TouchableOpacity onPress={() => onProfilePress?.(chat)}>
          <Image source={{ uri: otherMember.avatar }} style={avatarStyle} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={themed($avatarContainer)}>
      <TouchableOpacity onPress={() => onProfilePress?.(chat)}>
        {/* <View style={themed($avatar)}>
        <Text style={themed($groupAvatarText)}>
        {chat.name?.[0]?.toUpperCase() || getChatName(chat, SELF_USER.id)[0]}
        </Text>
        </View> */}
        <Image
          source={{
            uri: selfMember?.avatar || 'https://i.pravatar.cc/150?u=self',
          }}
          style={avatarStyle}
        />
        {!isDM && (
          <View style={themed($memberCount)}>
            <Text style={themed($memberCountText)}>{chat.members.length}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

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

const chatRequestItemProps = {
  height: 100,
  topSeparator: true,
  bottomSeparator: true,
};

type ChatRequestItemProps = {
  item: Chat;
  onChatPress?: (chat: Chat) => void;
  onProfilePress?: (chat: Chat) => void;
  onAccept: (chat: Chat) => void;
  onReject: (chat: Chat) => void;
  rejectButtonText?: string;
  acceptButtonText?: string;
};

export const ChatRequestItem = ({
  item: chat,
  onChatPress,
  onProfilePress,
  onAccept,
  onReject,
  rejectButtonText,
  acceptButtonText,
}: ChatRequestItemProps) => {
  const { themed } = useAppTheme();
  return (
    <View style={[themed($chatCard), chat.pinned && themed($pinnedChat)]}>
      <ListItem
        onPress={() => onChatPress?.(chat)}
        LeftComponent={renderChatAvatar(chat, onProfilePress)}
        textStyle={[
          themed($chatName),
          !chat.lastMessage?.read && themed($unreadChatName),
        ]}
        RightComponent={
          <View style={themed($rightContainer)}>
            <Text style={[themed($timestamp)]}>
              {chat.lastMessage?.timestamp}
            </Text>
          </View>
        }
        style={themed($listItem)}
      >
        <View style={{ flexDirection: 'column' }}>
          <Text>{chat.name}</Text>
          {chat.handle && (
            <Text style={themed($chatHandle)}>{'@' + chat.handle}</Text>
          )}
          {chat.lastMessage && (
            <Text numberOfLines={1} style={themed($lastMessage)}>
              {chat.lastMessage?.text}
            </Text>
          )}
        </View>
      </ListItem>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          width: '100%',
        }}
      >
        <Button
          text={acceptButtonText || 'Accept'}
          style={themed($acceptButton)}
          onPress={() => onAccept(chat)}
        />
        <Button
          text={rejectButtonText || 'Reject'}
          style={themed($rejectButton)}
          onPress={() => onReject(chat)}
        />
      </View>
    </View>
  );
};

interface ChatItemProps {
  item: Chat;
  onChatPress?: (chat: Chat) => void;
  onProfilePress?: (chat: Chat) => void;
  onLeaveChat?: (chat: Chat) => void;
}

// Convert to a proper React component
export const ChatItem = ({
  item: chat,
  onChatPress,
  onProfilePress,
  onLeaveChat,
}: ChatItemProps) => {
  const { themed } = useAppTheme();

  const swipeableRef = useRef<SwipeableRef>(null);

  // const renderRightActions = ({ progress }: { progress: number }) => {
  //   if (progress < 0.5) {
  //     return null;
  //   }

  //   return (
  //     <View style={{ width: "100%", flexDirection: 'row', alignItems: 'center', gap: 10 }}>
  //       <TouchableOpacity
  //         style={themed($deleteAction)}
  //         onPress={() => onLeaveChat?.(chat)}
  //       >
  //         <Text style={themed($deleteActionText)}>Leave</Text>
  //       </TouchableOpacity>
  //     </View>
  //   );
  // };

  function renderRightActions(
    prog: SharedValue<number>,
    drag: SharedValue<number>
  ) {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 50 }],
      };
    });

    return (
      <Reanimated.View style={styleAnimation}>
        {/* <TouchableOpacity onPress={() => onLeaveChat?.(chat)}> */}
        {/* </TouchableOpacity> */}
          <View style={themed($deleteAction)}>
            <Text style={themed($deleteActionText)}>Leave</Text>
          </View>
      </Reanimated.View>
    );
  }

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      onSwipeableOpen={() => {
        onLeaveChat?.(chat);
        swipeableRef.current?.close();
      }}
      ref={swipeableRef as any}
      overshootRight={true}
      // friction={2}
      rightThreshold={60}
      onSwipeableWillOpen={() => {
        // onLeaveChat?.(chat);
        console.log('onSwipeableWillOpen');
      }}
    >
      <View style={[themed($chatCard), chat.pinned && themed($pinnedChat)]}>
        <ListItem
          LeftComponent={renderChatAvatar(chat, onProfilePress)}
          textStyle={[
            themed($chatName),
            !chat.lastMessage?.read && themed($unreadChatName),
          ]}
          onPress={() => onChatPress?.(chat)}
          RightComponent={
            <View style={themed($rightContainer)}>
              <TouchableOpacity onPress={() => onChatPress?.(chat)}>
                <Text
                  style={[
                    themed($timestamp),
                    // !chat.lastMessage?.read && themed($unreadTimestamp),
                    // chat.muted && themed($mutedText),
                  ]}
                >
                  {chat.lastMessage?.timestamp}
                </Text>
                {chat.unreadCount > 0 && (
                  <View
                    style={[
                      themed($unreadBadge),
                      chat.muted && themed($mutedBadge),
                    ]}
                  >
                    <Text style={themed($unreadText)}>{chat.unreadCount}</Text>
                  </View>
                )}
                {/* {chat.muted && <Text style={themed($mutedIcon)}>🔇</Text>} */}
                {/* {chat.pinned && <Text style={themed($pinnedIcon)}>📌</Text>} */}
              </TouchableOpacity>
            </View>
          }
          style={themed($listItem)}
        >
          <View style={{ flexDirection: 'column' }}>
            <Text>{chat.name}</Text>
            {chat.handle && (
              <Text style={themed($chatHandle)}>{'@' + chat.handle}</Text>
            )}
            {chat.lastMessage && (
              <Text numberOfLines={1} style={themed($lastMessage)}>
                {chat.lastMessage?.text}
              </Text>
            )}
          </View>
        </ListItem>
      </View>
    </Swipeable>
  );
};

const $acceptButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
  borderRadius: 10,
  minHeight: 4,
  flex: 1,
});

const $rejectButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
  borderRadius: 10,
  minHeight: 4,
  flex: 1,
});

const $onlineBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  bottom: 0,
  right: 0,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: '#4CAF50',
  borderWidth: 2,
  borderColor: colors.background,
});

const $verifiedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  bottom: -2,
  right: -2,
  backgroundColor: colors.palette.primary500,
  borderRadius: 10,
  width: 20,
  height: 20,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: colors.background,
});

const $deleteAction: ThemedStyle<ViewStyle> = ({ colors }) => ({
  // backgroundColor: colors.error,
  // borderRadius: 10,
  // minHeight: 4,
  // width: 100,
});

const $deleteActionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  backgroundColor: colors.error,
  width: 50,
});

// Styles

const $lastMessage: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  // color: colors.palette.neutral600,
  color: colors.text,
  // marginTop: spacing.xs,
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  // marginBottom: spacing.xs,
  // maxWidth: 240,
});

const $chatHandle: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.palette.neutral600,
});

const $chatCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  // backgroundColor: colors.palette.neutral100,
  // marginBottom: spacing.sm,
  borderRadius: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  // elevation: 3,
});

const $pinnedChat: ThemedStyle<ViewStyle> = ({ colors }) => ({
  borderLeftWidth: 3,
  borderLeftColor: colors.palette.primary500,
});

const $listItem: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // paddingVertical: spacing.xs,
  paddingHorizontal: spacing.md,
});

const $avatarContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  position: 'relative',
  marginRight: spacing.sm,
  paddingTop: spacing.sm,
});

const $avatar: ThemedStyle<ViewStyle> = () => ({
  width: 48,
  height: 48,
  borderRadius: 25,
});

const $groupAvatar: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.secondary300,
  justifyContent: 'center',
  alignItems: 'center',
});

const $groupAvatarText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 20,
  fontWeight: 'bold',
});

const $memberCount: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  bottom: -2,
  right: -2,
  backgroundColor: colors.palette.secondary500,
  width: 24,
  height: 24,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: colors.background,
});

const $memberCountText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 11,
  fontWeight: 'bold',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'absolute',
});

const $chatName: ThemedStyle<TextStyle> = () => ({
  fontSize: 16,
  marginBottom: 2,
});

const $unreadChatName: ThemedStyle<TextStyle> = () => ({
  fontWeight: 'bold',
});

const $rightContainer: ThemedStyle<ViewStyle> = () => ({
  alignItems: 'flex-end',
});

const $timestamp: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.xs,
});

const $unreadBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  minWidth: 24,
  height: 24,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 4,
});

const $mutedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.neutral600,
  opacity: 0.6,
});

const $unreadText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 13,
  fontWeight: 'bold',
});
