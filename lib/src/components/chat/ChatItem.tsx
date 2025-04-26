import {
  Image,
  TextStyle,
  View,
  ViewStyle,
  TouchableOpacity,
  ImageStyle,
} from 'react-native';
import { useRef } from 'react';
import { ThemedStyle } from '../../theme';
import { ListItem } from '../../components/ListItem';
import { Text, Button } from '../../components';
import { useAppTheme } from '../../utils/useAppTheme';
import { useConvo } from '../../contexts/ConvoContext';
import Swipeable, {
  SwipeableRef,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import {
  $avatar,
  $avatarContainer,
  $userInfo,
  $userName,
  $userHandle,
  $userStatus,
} from './styles';

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
  verified: boolean;
  verifier: boolean;
}

const renderChatAvatar = (
  chat: Chat,
  onProfilePress?: (id: string) => void
) => {
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
        <TouchableOpacity onPress={() => onProfilePress?.(otherMember!.id)}>
          <Image source={{ uri: otherMember.avatar }} style={themed($avatar)} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={themed($avatarContainer)}>
      <TouchableOpacity onPress={() => onProfilePress?.(chat.id)}>
        {/* <View style={themed($avatar)}>
        <Text style={themed($groupAvatarText)}>
        {chat.name?.[0]?.toUpperCase() || getChatName(chat, SELF_USER.id)[0]}
        </Text>
        </View> */}
        <Image
          source={{
            uri: selfMember?.avatar || 'https://i.pravatar.cc/150?u=self',
          }}
          style={themed($avatar)}
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
  onProfilePress?: (id: string) => void;
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
        <ChatDescription chat={chat} />
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

const blueCheck = () => {
  return (
    <View
      style={{
        backgroundColor: '#208bfe',
        borderRadius: 30,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FontAwesome name="check" size={12} color="white" />
    </View>
  );
};

const ChatDescription = ({ chat }: { chat: Chat }) => {
  const { themed } = useAppTheme();
  return (
    <View style={themed($userInfo)}>
      <View style={{ flexDirection: 'row' }}>
        <Text text={chat.name} style={themed($userName)} size="xs" />
        {chat.verified && blueCheck()}
      </View>
      {chat.handle && (
        <Text text={`@${chat.handle}`} size="xxs" style={themed($userHandle)} />
      )}
      {chat.lastMessage && (
        <Text
          text={chat.lastMessage?.text}
          size="xs"
          style={themed($lastMessage)}
          numberOfLines={1}
        />
      )}
    </View>
  );
};

interface ChatItemProps {
  item: Chat;
  onChatPress?: (chat: Chat) => void;
  onProfilePress?: (id: string) => void;
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

  function renderRightActions(
    prog: SharedValue<number>,
    drag: SharedValue<number>
  ) {
    const styleAnimation = useAnimatedStyle(() => {
      return {
        transform: [{ translateX: drag.value + 300 }],
      };
    });

    return (
      <Reanimated.View style={styleAnimation}>
        <View style={themed($deleteAction)}>
          {/* <Text style={themed($deleteActionText)}>Leave</Text> */}
          <FontAwesome name="trash" size={24} color="white" />
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
      // rightThreshold={60}
      onSwipeableWillOpen={() => {
        console.log('onSwipeableWillOpen');
      }}
      animationOptions={{
        duration: 100,
      }}
    >
      {/* <View style={[themed($chatCard), chat.pinned && themed($pinnedChat)]}> */}
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
              <Text style={[themed($timestamp)]}>
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
        <ChatDescription chat={chat} />
      </ListItem>
      {/* </View> */}
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

const $deleteAction: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.error,
  width: 300,
  // borderRadius: 10,
  // minHeight: 4,
  // width: 100,
  justifyContent: 'center',
  alignItems: 'center',
  // paddingRight: 10,
  height: '100%',
});

const $deleteActionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
  backgroundColor: colors.error,
  // width: 300,
  // height: "100%",
});

// Styles

const $lastMessage: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 14,
  color: colors.text,
  textOverflow: 'ellipsis',
  overflow: 'hidden',
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
