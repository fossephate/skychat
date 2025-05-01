// @ts-nocheck
import { ThemedStyle } from '../../theme';
import ChatMessageBox from './ChatMessageBox';
import ReplyMessageBar from './ReplyMessageBar';
import { useAppTheme } from '../../utils/useAppTheme';
import { translate } from '../../i18n';
import { Header, Text, TextField } from '../../components';
import { ChatListProps } from './ChatList';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ImageBackground,
  View,
  ViewStyle,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import {
  IMessage,
  GiftedChat,
  SystemMessage,
  Bubble,
  Send,
  InputToolbar,
  MessageImage,
} from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import { EmojiPopup } from 'react-native-emoji-popup';
import { router, useLocalSearchParams } from 'expo-router';
import { Agent } from '@atproto/api';
import { PostRenderer } from '../bsky/PostRenderer';
import { Button } from '../Button';
import { FontAwesome } from '@expo/vector-icons';
import { useStrings } from '../../contexts/strings';
import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';
import ActionSheet, {
  ActionSheetRef,
  SheetManager,
} from 'react-native-actions-sheet';

import { TouchableOpacity } from 'react-native';

export interface ChatWrapperProps {
  agent: Agent;
  groupId: string;
  refreshInterval?: number; // Auto-refresh interval in ms
  onPressAvatar?: (id: string) => void;
  messages: IMessage[];
  onSend: (messages: IMessage[]) => void;
  loading: boolean;
  convoMembers: any[];
  onPressLink?: (link: string) => void;
  onLongPressMessage?: (message: IMessage) => void;
  onEmojiSelected?: (message: IMessage, emoji: string) => void;
}

export const ChatWrapper: React.FC<ChatWrapperProps> = ({
  agent,
  groupId,
  onPressAvatar,
  messages,
  convoMembers,
  onSend,
  loading,
  onPressLink,
  onLongPressMessage,
  onEmojiSelected,
}) => {
  const s = useStrings();
  const [text, setText] = useState('');
  const [convoName, setConvoName] = useState('Chat');
  const insets = useSafeAreaInsets();

  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null);
  const [reactionMessage, setReactionMessage] = useState<IMessage | null>(null);

  const swipeableRowRef = useRef<Swipeable | null>(null);

  const userDid = agent.assertDid;

  const { themed, theme } = useAppTheme();

  const [pickerOpen, setPickerOpen] = React.useState<boolean>(false);

  const updateRowRef = useCallback(
    (ref: any) => {
      if (
        ref &&
        replyMessage &&
        ref.props.children.props.currentMessage?._id === replyMessage._id
      ) {
        swipeableRowRef.current = ref;
      }
    },
    [replyMessage]
  );

  // useEffect(() => {
  //   if (replyMessage && swipeableRowRef.current) {
  //     swipeableRowRef.current.close();
  //     swipeableRowRef.current = null;
  //   }
  // }, [replyMessage]);

  // Get avatar for the chat (either group avatar or the other member's avatar)
  const getConvoAvatar = () => {
    if (convoMembers.length === 0)
      return `https://i.pravatar.cc/150?u=${groupId}`;

    if (convoMembers.length > 2) {
      // For group chats, use a placeholder or generate a group avatar
      return `https://i.pravatar.cc/150?u=group_${groupId}`;
    } else {
      // For DMs, use the other person's avatar
      const otherMember = convoMembers.find((member) => member.did !== userDid);
      return (
        otherMember?.avatar ||
        `https://i.pravatar.cc/150?u=${otherMember?.did || groupId}`
      );
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.background,
        }}
      >
        <ActivityIndicator
          size="large"
          color={theme.colors.palette.primary500}
        />
        <Text style={{ marginTop: 10 }}>Loading messages...</Text>
      </View>
    );
  }

  const pickerDarkTheme = {
    backdrop: '#16161888',
    knob: '#766dfc',
    container: '#282829',
    header: '#fff',
    skinTonesContainer: '#252427',
    category: {
      icon: '#766dfc',
      iconActive: '#fff',
      container: '#252427',
      containerActive: '#766dfc',
    },
    search: {
      text: '#fff',
      placeholder: '#ffffff2c',
      icon: '#fff',
      background: '#00000011',
    },
  };

  return (
    <>
      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        theme={theme.isDark ? pickerDarkTheme : undefined}
        enableSearchBar
        onEmojiSelected={(emoji: string) => {
          onEmojiSelected(reactionMessage, emoji.emoji);
        }}
      />
      <GiftedChat
        messages={messages}
        onSend={(messages: any) => onSend(messages)}
        onInputTextChanged={setText}
        user={{
          _id: userDid || '1',
        }}
        renderSystemMessage={(props) => (
          <SystemMessage
            {...props}
            textStyle={{ color: theme.colors.palette.neutral300 }}
          />
        )}
        renderAvatar={() => (
          <Image
            source={{ uri: getConvoAvatar() }}
            style={{ width: 32, height: 32, borderRadius: 16 }}
          />
        )}
        maxComposerHeight={100}
        // minComposerHeight={10}
        // bottomOffset={insets.bottom}
        isKeyboardInternallyHandled={false}
        textInputProps={{ style: themed($textInput) }}
        renderBubble={(props: any) => {
          let reactions = props.currentMessage.reactions ?? [];
          let isSelf = props.currentMessage.user._id === userDid;
          let textEmpty = props.currentMessage.text === '';
          return (
            <View style={{ marginVertical: 4 }}>
              <Bubble
                {...props}
                textStyle={{
                  left: {
                    color: theme.colors.text,
                  },
                  right: {
                    color: theme.colors.text,
                  },
                }}
                wrapperStyle={{
                  borderRadius: 24,
                  left: {
                    backgroundColor: textEmpty
                      ? 'transparent'
                      : theme.colors.palette.neutral300,
                  },
                  right: {
                    backgroundColor: textEmpty
                      ? 'transparent'
                      : theme.colors.palette.primary500,
                  },
                }}
              />
              {reactions.length > 0 && (
                <View
                  style={[
                    themed($reactionContainer),
                    { justifyContent: isSelf ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <View
                    style={[
                      themed($reactionText),
                      isSelf ? { right: 8 } : { left: 8 },
                    ]}
                  >
                    {reactions.map((reaction: string) => (
                      <TouchableOpacity key={reaction} onPress={() => {
                        onEmojiSelected(props.currentMessage, reaction);
                      }}>
                        <Text key={reaction}>{reaction}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        }}
        renderMessageText={(props) => {
          return (
            <Text style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              {props.currentMessage.text}
            </Text>
          );
        }}
        placeholder={s('inputPlaceholder')}
        // renderComposer={(props) => {
        //   return (
        //     <View>
        //       <TextField
        //         style={{
        //           backgroundColor: 'red',
        //         }}
        //       />
        //     </View>
        //   )
        // }}
        isTyping={false}
        infiniteScroll
        onPressActionButton={() => {
          console.log('action button pressed');
        }}
        isScrollToBottomEnabled={true}
        // renderComposer={() => (
        //   <View>
        //     <Text>Composer</Text>
        //   </View>
        // )}
        onPressAvatar={(user) => {
          onPressAvatar(user._id);
        }}
        renderSend={(props) => (
          <View style={themed($sendStyle)}>
            {/* {text === "" && (
                <>
                  <Ionicons name="camera-outline" color={theme.colors.palette.primary300} size={28} />
                  <Ionicons name="mic-outline" color={theme.colors.palette.primary300} size={28} />
                </>
              )} */}
            {text !== '' && (
              <Send
                {...props}
                containerStyle={{
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <Ionicons
                  name="send"
                  color={themed($sendStyle).color}
                  size={28}
                />
              </Send>
            )}
          </View>
        )}
        renderMessageVideo={(props) => {
          if (!props.currentMessage.video) {
            return null;
          }
          let videoUrl = props.currentMessage.video;
          return <PostRenderer url={videoUrl} agent={agent} />;
        }}
        renderMessageImage={(props) => {
          if (!props.currentMessage.image) {
            return null;
          }
          return (
            <View>
              <Text>{props.currentMessage.image}</Text>
            </View>
          );
        }}
        // renderMessageImage={(props) => (
        //   <InputToolbar
        //     {...props}
        //     containerStyle={{ backgroundColor: "blue" }}

        //     renderActions={() => (
        //       <View style={{ height: 44, justifyContent: "center", alignItems: "center", left: 5 }}>
        //         {/* <Ionicons name="add" color={theme.colors.palette.primary300} size={28} /> */}
        //       </View>
        //     )}
        //   />
        // )}
        renderInputToolbar={(props) => (
          <InputToolbar
            {...props}
            // containerStyle={themed($inputToolbar)}
            containerStyle={{
              borderTopWidth: 0,
              borderTopColor: 'transparent',
              backgroundColor: 'transparent',
            }}
            // renderActions={() => (
            //   <View
            //     style={{
            //       height: 64,
            //       justifyContent: 'center',
            //       alignItems: 'center',
            //       left: 5,
            //     }}
            //   >
            //     <Ionicons
            //       name="add"
            //       color={theme.colors.palette.primary300}
            //       size={28}
            //     />
            //   </View>
            // )}
            renderActions={() => {
              return <></>;
            }}
          />
        )}
        renderChatFooter={() => (
          <ReplyMessageBar
            clearReply={() => setReplyMessage(null)}
            message={replyMessage}
          />
        )}
        // onLongPress={(context, message) => setReplyMessage(message)}
        onLongPress={(context, message) => {
          setReactionMessage(message);
          console.log('message', message);
          setPickerOpen(true);

          // SheetManager.show('messageActionsSheet', {
          //   payload: {
          //     agent: agent,
          //   },
          // });



          // console.log('onLongPress', context, message);
          // onLongPressMessage(message);
          // context.actionSheet().showActionSheetWithOptions({
          //   options: ["Reply", "Copy", "Cancel"],
          //   cancelButtonIndex: 2,
          // }, (buttonIndex) => {
          //   if (buttonIndex === 0) {
          //     setReplyMessage(message)
          //   }
          // })
          // context.actionSheet().showActionSheetWithOptions({
          //   options: ["Reply", "Copy", "React", "Cancel"],
          //   cancelButtonIndex: 3,
          // }, (buttonIndex) => {
          //   if (buttonIndex === 0) {
          //     setReplyMessage(message)
          //   }
          //   if (buttonIndex === 1) {
          //     console.log("Copy", message)
          //   }
          //   if (buttonIndex === 2) {
          //     console.log("React", message)
          //   }
          // })
        }}
        renderMessage={(props) => (
          <ChatMessageBox
            {...props}
            setReplyOnSwipeOpen={setReplyMessage}
            updateRowRef={updateRowRef}
          />
        )}
        renderTime={(props) => {
          // return (
          //   <Text>{props.currentMessage.createdAt.toLocaleTimeString()}</Text>
          // )
          return <></>;
        }}
        scrollToBottomComponent={() => (
          <View style={themed($fabButton)}>
            <FontAwesome name="chevron-down" color="white" size={20} />
          </View>
        )}
      />
    </>
  );
};

const $fabButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
  borderRadius: 24,
  width: 50,
  height: 50,
  justifyContent: 'center',
  alignItems: 'center',
});

const $textInput: ThemedStyle<TextInputStyle> = ({ colors }) => ({
  color: colors.text,
  backgroundColor: colors.border,
  borderRadius: 24,
  paddingLeft: 18,
  marginTop: 4,
  lineHeight: 28,
  marginLeft: 16,
  marginRight: 16,
  marginBottom: 8,
  flex: 1,
  height: 44,
  fontSize: 16,
});

const $reactionContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flexDirection: 'row',
  flex: 1,
  marginTop: -8,
  shadowColor: '#000',
  shadowOffset: {
    width: 0,
    height: 5,
  },
  shadowOpacity: 0.34,
  shadowRadius: 6.27,
  elevation: 10,
});

const $reactionText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 10,
  backgroundColor: colors.background,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 16,
  flexDirection: 'row',
  gap: 8,
  borderWidth: 1,
  borderColor: colors.border,
});

const $sendStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  color: colors.palette.primary300,
  height: 64,
  marginRight: 14,
});

const $inputToolbar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  height: 64,
  backgroundColor: colors.background,
  color: colors.text,
});

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});
