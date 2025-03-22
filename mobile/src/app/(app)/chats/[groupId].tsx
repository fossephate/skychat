import { Ionicons } from "@expo/vector-icons"
import messageData from "assets/data/messages.json"
import { ThemedStyle } from "@/theme"

import ChatMessageBox from "@/components/Chat/ChatMessageBox"
import ReplyMessageBar from "@/components/Chat/ReplyMessageBar"
import { Screen } from "@/components"
import { useAppTheme } from "@/utils/useAppTheme"
import React, { useState, useRef, useEffect, useCallback } from "react"
import { ImageBackground, View, ViewStyle, Image, ActivityIndicator } from "react-native"
import { Swipeable } from "react-native-gesture-handler"
import {
  IMessage,
  GiftedChat,
  SystemMessage,
  Bubble,
  Send,
  InputToolbar,
} from "react-native-gifted-chat"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Header, Text } from "@/components"
import { router, useLocalSearchParams } from "expo-router"
import { useAuth } from "@/contexts/AuthContext"
import { Agent } from "@atproto/api"
import { translate } from "@/i18n"
import { useConvo } from "@/contexts/ConvoContext"


export default function Page() {
  const [messages, setMessages] = useState<IMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [convoName, setConvoName] = useState("Chat")
  const [convoMembers, setConvoMembers] = useState<any[]>([])
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const { groupId } = useLocalSearchParams()
  const convoContext = useConvo()

  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null)
  const swipeableRowRef = useRef<Swipeable | null>(null)

  const { themed, theme } = useAppTheme()

  // map did's to profile images:
  const [profileImages, setProfileImages] = useState<Record<string, string>>({});

  const getProfileImage = async (did: string) => {
    if (!session) return
    const agent = new Agent(session)
    const profile = await agent.com.atproto.repo.getRecord({ repo: did, collection: "app.bsky.actor.profile", rkey: "self" })
    // @ts-ignore - Handling potential type issues
    const avatarUri = profile.data.value.avatar
    console.log(avatarUri)
    return avatarUri || undefined
  }

  async function fetchMessages() {
    console.log("fetching messages")
    // get the group id from the url

    const chat = await convoContext.getGroupChat(groupId as string)
    // setMessages(messages)
    setConvoName(chat.name)

    // map the messages to the format we want:
    const messages = chat.decrypted.map((msg) => ({
      _id: msg.senderId + msg.text + msg.timestamp,
      text: msg.text,
      createdAt: new Date(Number(msg.timestamp)),
      user: {
        _id: msg.senderId,
        name: msg.senderId,
      },
      // system: true,
    }))
    console.log("messages", messages)
    setMessages(messages.reverse())
    setLoading(false)
  }

  useEffect(() => {
    fetchMessages()
    startMessageListener()
    setTimeout(() => setLoading(false), 1000)
  }, [groupId, session])

  // Real-time message listener implementation
  const messageListenerRef = useRef<any>(null)

  const startMessageListener = async () => {
    // if (!groupId) return
    clearInterval(messageListenerRef.current)
    messageListenerRef.current = setInterval(async () => {
      await fetchMessages()
    }, 3000);
  }

  const stopMessageListener = () => {
    if (messageListenerRef.current) {
      clearInterval(messageListenerRef.current)
      messageListenerRef.current = null
    }
  }

  // call stopMessageListener when the component unmounts:
  useEffect(() => {
    return () => stopMessageListener()
  }, [])

  const fromB64 = (b64: string): ArrayBuffer => {
    // Create a buffer from the base64 string
    const buffer = Buffer.from(b64, "base64");
    // Get the underlying ArrayBuffer and create a new one to ensure it's only ArrayBuffer
    const arrayBuffer = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; i++) {
      view[i] = buffer[i];
    }
    return arrayBuffer;
  }

  const onSend = useCallback(async (newMessages = []) => {
    // if (!session || newMessages.length === 0) {
    //   console.error("Cannot send message: missing session, groupId, or message")
    //   return
    // }

    const messageText = newMessages[0].text;

    console.log("messageText", messageText)

    // base64 decode groupId to get the array buffer:
    const groupIdBuffer = fromB64(groupId as string)

    try { 
      convoContext.sendMessage(groupIdBuffer, messageText)
    } catch (error) {
      console.error("Error sending message:", error)
    }

    console.log("message sent!")

    // Optimistically update UI
    // setMessages((previousMessages) => GiftedChat.append(previousMessages, newMessages))

    // try {
    //   const agent = new Agent(session)
    //   const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")

    //   const response = await proxy.chat.bsky.convo.sendMessage({
    //     convoId: groupId as string,
    //     message: {
    //       text: messageText,
    //       // TODO: facets
    //     },
    //   })

    //   console.log("Message sent successfully", response.data)

    //   // Clear reply state after sending
    //   setReplyMessage(null)
    // } catch (error) {
    //   console.error("Error sending message:", error)
    //   // Consider showing an error to the user and/or removing the optimistically added message
    // }
  }, [groupId, session, replyMessage])

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
    backgroundImage = require("assets/images/splash-dark.png")
  } else {
    backgroundImage = require("assets/images/splash.png")
  }

  // Get avatar for the chat (either group avatar or the other member's avatar)
  const getConvoAvatar = () => {
    if (convoMembers.length === 0) return `https://i.pravatar.cc/150?u=${groupId}`

    if (convoMembers.length > 2) {
      // For group chats, use a placeholder or generate a group avatar
      return `https://i.pravatar.cc/150?u=group_${groupId}`
    } else {
      // For DMs, use the other person's avatar
      const otherMember = convoMembers.find(member => member.did !== session?.did)
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

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screenContainer)} safeAreaEdges={["bottom"]}>
      {/* // <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingBottom: insets.bottom }}> */}
      <ImageBackground
        source={backgroundImage}
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}>
        <Header title={convoName} leftIcon="back" onLeftPress={() => router.back()} />
        <GiftedChat
          messages={messages}
          onSend={(messages: any) => onSend(messages)}
          onInputTextChanged={setText}
          user={{
            _id: session?.did || '1',
          }}
          renderSystemMessage={(props) => (
            <SystemMessage {...props} textStyle={{ color: theme.colors.text }} />
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
          textInputProps={themed($composer)}
          renderBubble={(props) => {
            return (
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
            )
          }}
          placeholder={translate("chatScreen:inputPlaceholder")}
          isTyping={false}
          infiniteScroll
          onPressActionButton={() => {
            console.log("action button pressed")
          }}
          isScrollToBottomEnabled={true}
          renderSend={(props) => (
            <View
              style={{
                height: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                paddingHorizontal: 14,
              }}
            >
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
                  <Ionicons name="send" color={theme.colors.palette.primary300} size={28} />
                </Send>
              )}
            </View>
          )}

          renderInputToolbar={(props) => (
            <InputToolbar
              {...props}
              containerStyle={{ backgroundColor: theme.colors.background }}
              renderActions={() => (
                <View style={{ height: 44, justifyContent: "center", alignItems: "center", left: 5 }}>
                  <Ionicons name="add" color={theme.colors.palette.primary300} size={28} />
                </View>
              )}
            />
          )}
          renderChatFooter={() => (
            <ReplyMessageBar clearReply={() => setReplyMessage(null)} message={replyMessage} />
          )}
          onLongPress={(context, message) => setReplyMessage(message)}
          renderMessage={(props) => (
            <ChatMessageBox
              {...props}
              setReplyOnSwipeOpen={setReplyMessage}
              updateRowRef={updateRowRef}
            />
          )}
        />
      </ImageBackground>
      {/* </View> */}
    </Screen>
  )
}

const $composer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: 18,
  backgroundColor: colors.border,
  paddingHorizontal: 10,
  color: colors.text,
})

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})