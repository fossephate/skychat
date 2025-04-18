// @ts-nocheck
import { ThemedStyle } from "../../theme"
import ChatMessageBox from "./ChatMessageBox"
import ReplyMessageBar from "./ReplyMessageBar"
import { useAppTheme } from "../../utils/useAppTheme"
import { translate } from "../../i18n"
import { Header, Text } from "../../components"
import { ChatListProps } from "./ChatList"
import React, { useState, useRef, useEffect, useCallback } from "react"
import { ImageBackground, View, ViewStyle, Image, ActivityIndicator } from "react-native"
import { Swipeable } from "react-native-gesture-handler"
import { Ionicons } from "@expo/vector-icons"
import {
  IMessage,
  GiftedChat,
  SystemMessage,
  Bubble,
  Send,
  InputToolbar,
} from "react-native-gifted-chat"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { EmojiPopup } from 'react-native-emoji-popup';
import { router, useLocalSearchParams } from "expo-router"
import { Agent } from "@atproto/api"
import { PostRenderer } from "../bsky/PostRenderer";

export interface BskyChatProps {
  agent: Agent;
  groupId: string;
  refreshInterval?: number; // Auto-refresh interval in ms
  inputPlaceholder?: string;
  onPressAvatar?: (id: string) => void;
}

const getBskyDirectEmbedUrl = (url) => {
  // For Bluesky posts, the direct embed URL format is:
  // https://embed.bsky.app/v1/[post-url]

  // Handle AT protocol URIs
  if (url.startsWith('at://')) {
    // Convert AT URI to embed format
    // at://did:plc:abcdef/app.bsky.feed.post/12345 would become:
    // did:plc:abcdef/app.bsky.feed.post/12345
    const atPath = url.replace('at://', '');
    return `https://embed.bsky.app/v1/${atPath}`;
  }

  // Handle bsky.app URLs
  if (url.includes('bsky.app/profile/')) {
    // Extract the post path from the URL
    // From: https://bsky.app/profile/username.bsky.social/post/12345
    // To: https://embed.bsky.app/v1/profile/username.bsky.social/post/12345

    // Get everything after bsky.app
    const postPath = url.split('bsky.app')[1];
    return `https://embed.bsky.app/v1${postPath}`;
  }

  // If it's not in a recognized format, return the original URL
  return url;
}

export const BskyChat: React.FC<BskyChatProps> = ({
  agent,
  groupId,
  inputPlaceholder = "Write a message",
  onPressAvatar,
}) => {
  const [messages, setMessages] = useState<IMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [convoName, setConvoName] = useState("Chat")
  const [convoMembers, setConvoMembers] = useState<any[]>([])
  const insets = useSafeAreaInsets()
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null)
  const swipeableRowRef = useRef<Swipeable | null>(null)

  const userDid = agent.assertDid;

  const { themed, theme } = useAppTheme()

  const [emoji, setEmoji] = useState("🫡");



  // map did's to profile images:
  const [profileImages, setProfileImages] = useState<Record<string, string>>({});

  const getProfileImage = async (did: string) => {
    const profile = await agent.com.atproto.repo.getRecord({ repo: did, collection: "app.bsky.actor.profile", rkey: "self" })
    // @ts-ignore - Handling potential type issues
    const avatarUri = profile.data.value.avatar
    return avatarUri || undefined
  }

  const transformMessages = async (messages: any[]) => {
    const transformedMessages: IMessage[] = await Promise.all(messages.map(async msg => {
      // The sender is the current user if their DID matches the message sender
      const isSelf = msg.sender?.did === userDid;

      // check if we have an avatar for this user, if not, get it:
      if (!profileImages[msg.sender?.did]) {
        const profileImage = await getProfileImage(msg.sender?.did)
        setProfileImages(prev => ({ ...prev, [msg.sender?.did]: profileImage }))
      }

      let reactions: strint[] = []

      if (msg.reactions) {
        for (const reaction of msg.reactions) {
          reactions.push(reaction.value);
        }
      }

      // get the profile image for the sender:
      const profileImage = profileImages[msg.sender?.did] ?? `https://i.pravatar.cc/150?u=${msg.sender?.did}`

      // extract the first link from the text if it exists:
      const link = msg.text.match(/https?:\/\/[^\s]+/)?.[0];

      let message: IMessage = {
        _id: msg.id,
        text: msg.text,
        createdAt: new Date(msg.sentAt),
        reactions: reactions,
        user: {
          _id: msg.sender?.did || "unknown",
          name: isSelf ? "You" : (msg.sender?.displayName || msg.sender?.handle || "User"),
          avatar: profileImage
        },
        video: link,
      }
      return message;
    }))

    return transformedMessages;
  }

  const fetchMessages = async () => {
    if (!agent || !userDid || !groupId) {
      console.error("No agent, userDid, or groupId found")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")

      // Fetch conversation details first
      const convoResponse = await proxy.chat.bsky.convo.getConvo({
        convoId: groupId as string
      })

      const convoData = convoResponse.data.convo

      // Set conversation name and members
      if (convoData) {
        // For group chats, use the group name. For DMs, use the other user's name
        const otherMembers = convoData.members?.filter(
          member => member.did !== userDid
        ) || []

        console.log(convoData)

        if (convoData.name) {
          setConvoName(convoData.name)
        } else if (otherMembers.length === 1) {
          setConvoName(otherMembers[0].displayName || otherMembers[0].handle || "Chat")
        }

        setConvoMembers(convoData.members || [])
      }

      // Fetch messages
      const messagesData = await getConvoMessages();

      // Transform messages to GiftedChat format
      const transformedMessages: IMessage[] = await transformMessages(messagesData);

      // console.log("transformedMessages", transformedMessages)

      setMessages(transformedMessages)
    } catch (error) {
      console.error("Error fetching messages:", error)
      // Fallback to sample data for demo/testing
      setMessages([
        ...messageData.map((message: any) => {
          return {
            _id: message.id,
            text: message.msg,
            createdAt: new Date(message.date),
            user: {
              _id: message.from,
              name: message.from ? "You" : "Bob",
            },
          }
        }),
        {
          _id: 0,
          system: true,
          text: "Couldn't load messages from server, showing sample data",
          createdAt: new Date(),
          user: {
            _id: 0,
            name: "System",
          },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    startMessageListener()
  }, [groupId, agent, userDid])

  const getConvoMessages = async () => {
    const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")
    console.log("getConvoMessages", cursor)
    const messagesResponse = await proxy.chat.bsky.convo.getMessages({
      convoId: groupId as string,
      cursor: cursor,
      limit: 30,
    })
    setCursor(messagesResponse.data.cursor ?? undefined);
    return messagesResponse.data.messages ?? [];
  }

  // Real-time message listener implementation
  const messageListenerRef = useRef<any>(null)

  const startMessageListener = async () => {
    if (!agent || !userDid || !groupId) return

    try {
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")

      // Implement real-time message subscription
      messageListenerRef.current = setInterval(async () => {
        // Only check for new messages if we're not already loading
        if (loading) return

        try {
          // Get latest messages (assume API supports getting messages since a specific timestamp)
          // @ts-ignore
          // const latestMessage = messagesRef.current[0]
          // if (!latestMessage) return

          const newMessagesData = await getConvoMessages();

          if (newMessagesData.length > 0) {
            // Transform new messages
            const transformedMessages = await transformMessages(newMessagesData);
            setMessages(prevMessages => GiftedChat.append(prevMessages, transformedNewMessages))
          }
        } catch (error) {
          console.error("Error in message listener:", error)
        }
      }, 5000) // Check every 5 seconds - adjust as needed
    } catch (error) {
      console.error("Error setting up message listener:", error)
    }
  }

  const stopMessageListener = () => {
    if (messageListenerRef.current) {
      clearInterval(messageListenerRef.current)
      messageListenerRef.current = null
    }
  }

  const onSend = useCallback(async (newMessages = []) => {
    if (!agent || !userDid || !groupId || newMessages.length === 0) {
      console.error("Cannot send message: missing agent, userDid, groupId, or message")
      return
    }

    if (newMessages.length === 0) {
      console.error("Cannot send message: missing message")
      return
    }

    const messageText = newMessages[0].text

    // Optimistically update UI
    setMessages((previousMessages) => GiftedChat.append(previousMessages, newMessages))

    try {
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")

      const response = await proxy.chat.bsky.convo.sendMessage({
        convoId: groupId as string,
        message: {
          text: messageText,
          // TODO: facets
        },
      })

      console.log("Message sent successfully", response.data)

      // Clear reply state after sending
      setReplyMessage(null)
    } catch (error) {
      console.error("Error sending message:", error)
      // Consider showing an error to the user and/or removing the optimistically added message
    }
  }, [groupId, agent, userDid, replyMessage])

  const updateRowRef = useCallback(
    (ref: any) => {
      if (
        ref &&
        replyMessage &&
        ref.props.children.props.currentMessage?._id === replyMessage._id
      ) {
        swipeableRowRef.current = ref
      }
    },
    [replyMessage],
  )

  useEffect(() => {
    if (replyMessage && swipeableRowRef.current) {
      swipeableRowRef.current.close()
      swipeableRowRef.current = null
    }
  }, [replyMessage])

  let backgroundImage;
  if (theme.isDark) {
    backgroundImage = require("../../../../assets/images/splash-dark.png")
  } else {
    backgroundImage = require("../../../../assets/images/splash.png")
  }

  // Get avatar for the chat (either group avatar or the other member's avatar)
  const getConvoAvatar = () => {
    if (convoMembers.length === 0) return `https://i.pravatar.cc/150?u=${groupId}`

    if (convoMembers.length > 2) {
      // For group chats, use a placeholder or generate a group avatar
      return `https://i.pravatar.cc/150?u=group_${groupId}`
    } else {
      // For DMs, use the other person's avatar
      const otherMember = convoMembers.find(member => member.did !== userDid)
      return otherMember?.avatar || `https://i.pravatar.cc/150?u=${otherMember?.did || groupId}`
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.palette.primary500} />
        <Text style={{ marginTop: 10 }}>Loading messages...</Text>
      </View>
    )
  }

  const CloseButton = ({ close }: { close: () => void }) => (
    <Pressable onPress={close}>
      <Text>Close ❌</Text>
    </Pressable>
  );



  return (
    <ImageBackground
      source={backgroundImage}
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}>
      {/* <Header title={translate("chatScreen:title", { name: convoName })} leftIcon="back" onLeftPress={() => router.back()} /> */}

      <GiftedChat
        messages={messages}
        onSend={(messages: any) => onSend(messages)}
        onInputTextChanged={setText}
        user={{
          _id: userDid || '1',
        }}
        renderSystemMessage={(props) => (
          <SystemMessage {...props} textStyle={{ color: theme.colors.palette.neutral300 }} />
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
          return (
            <View>
              <Bubble
                {...props}
                textStyle={{
                  right: {
                    color: "#000",
                  },
                }}
                wrapperStyle={{
                  left: {
                    backgroundColor: "#fff",
                  },
                  right: {
                    backgroundColor: theme.colors.palette.secondary300,
                  },
                }}
              />
              {reactions.length > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: isSelf ? "flex-end" : "flex-start", gap: 2 }}>
                  {reactions.map((reaction: string) => (
                    <Text key={reaction}>{reaction}</Text>
                  ))}
                </View>
              )}
            </View>
          )
        }}
        // renderAccessory={() => {
        //   return (
        //     <View>
        //       <Text>Accessory</Text>
        //     </View>
        //   )
        // }}
        placeholder={inputPlaceholder}

        //   actionSheet?(): {
        //     showActionSheetWithOptions: (options: ActionSheetOptions, callback: (buttonIndex: number) => void | Promise<void>) => void;
        // };
        // actionSheet={() => {

        //   // return a function that returns a function (showActionSheetWithOptions)
        //   return (options: ActionSheetOptions, callback: (buttonIndex: number) => void | Promise<void>) => {
        //     return (
        //       <View>
        //         <Text>Action Sheet</Text>
        //       </View>
        //     )
        //   }
        // }}
        isTyping={false}
        infiniteScroll
        onPressActionButton={() => {
          console.log("action button pressed")
        }}
        isScrollToBottomEnabled={true}
        // renderComposer={() => (
        //   <View>
        //     <Text>Composer</Text>
        //   </View>
        // )}
        onPressAvatar={(user) => { onPressAvatar(user._id) }}
        renderSend={(props) => (
          <View style={themed($sendStyle)}>
            {/* {text === "" && (
                <>
                  <Ionicons name="camera-outline" color={theme.colors.palette.primary300} size={28} />
                  <Ionicons name="mic-outline" color={theme.colors.palette.primary300} size={28} />
                </>
              )} */}
            {text !== "" && (
              <Send
                {...props}
                containerStyle={{
                  justifyContent: "center",
                }}
              >
                <Ionicons name="send" color={themed($sendStyle).color} size={28} />
              </Send>
            )}
          </View>
        )}
        renderMessageVideo={(props) => {
          if (!props.currentMessage.video) {
            return null;
          }
          let videoUrl = props.currentMessage.video;
          return (
            <PostRenderer url={videoUrl} />
          );

          // return (
          //   <EmojiPopup
          //     onEmojiSelected={setEmoji}
          //     closeButton={CloseButton}
          //     // style={styles.buttonText}
          //   >
          //     <Text>Open Emoji Picker</Text>
          //   </EmojiPopup>
          // )
        }}
        renderMessageImage={(props) => {
          if (!props.currentMessage.image) {
            return null;
          }
          console.log("renderMessageImage", props)
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
            containerStyle={themed($inputToolbar)}
            style={{
              // backgroundColor: "red",
              // height: 64,
              // paddingHorizontal: 16,
            }}
            renderActions={() => (
              <View style={{ height: 64, justifyContent: "center", alignItems: "center", left: 5 }}>
                <Ionicons name="add" color={theme.colors.palette.primary300} size={28} />
              </View>
            )}
          />
        )}
        renderChatFooter={() => (
          <ReplyMessageBar clearReply={() => setReplyMessage(null)} message={replyMessage} />
        )}
        // onLongPress={(context, message) => setReplyMessage(message)}
        onLongPress={(context, message) => {
          console.log("onLongPress", context, message)
          // context.actionSheet().showActionSheetWithOptions({
          //   options: ["Reply", "Copy", "Cancel"],
          //   cancelButtonIndex: 2,
          // }, (buttonIndex) => {
          //   if (buttonIndex === 0) {
          //     setReplyMessage(message)
          //   }
          // })
          context.actionSheet().showActionSheetWithOptions({
            options: ["Reply", "Copy", "React", "Cancel"],
            cancelButtonIndex: 3,
          }, (buttonIndex) => {
            if (buttonIndex === 0) {
              setReplyMessage(message)
            }
            if (buttonIndex === 1) {
              console.log("Copy", message)
            }
            if (buttonIndex === 2) {
              console.log("React", message)
            }
          })
        }}
        renderMessage={(props) => (
          <ChatMessageBox
            {...props}
            setReplyOnSwipeOpen={setReplyMessage}
            updateRowRef={updateRowRef}
          />
        )}
      />
    </ImageBackground>
  )
}

const $textInput: ThemedStyle<TextInputStyle> = ({ colors }) => ({
  color: colors.text,
  // width: 100,
  // height: 144,
  backgroundColor: colors.border,
  // flex: 1,
  // paddingHorizontal: 24,
  paddingLeft: 12,
  marginTop: 4,
  lineHeight: 20,
  marginLeft: 16,
  marginRight: 16,
  marginBottom: 8,
  // width: 200,
  // width: "80%",
  flex: 1,
  height: 44,
  borderRadius: 24,
})

const $sendStyle: ThemedStyle<ViewStyle> = ({ colors }) => ({
  color: colors.palette.primary300,
  // backgroundColor: colors.background,
  height: 64,
  marginRight: 14,
  // flexDirection: "row",
  // alignItems: "center",
  // justifyContent: "center",
  // gap: 14,
  // paddingHorizontal: 14,
})

const $inputToolbar: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  height: 64,
  // width: 64,
  // paddingRight: 16,
  backgroundColor: colors.background,
  // paddingHorizontal: 8,
  color: colors.text,
  // paddingVertical: 8,
  // marginVertical: 2,
  // width: "100%",
})

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})