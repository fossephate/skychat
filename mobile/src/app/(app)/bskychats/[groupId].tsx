import { Ionicons } from "@expo/vector-icons"
import messageData from "assets/data/messages.json"
import { ThemedStyle } from "@/theme"

import ChatMessageBox from "@/components/Chat/ChatMessageBox"
import ReplyMessageBar from "@/components/Chat/ReplyMessageBar"
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

const Page = () => {
  const [messages, setMessages] = useState<IMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [convoName, setConvoName] = useState("Chat")
  const [convoMembers, setConvoMembers] = useState<any[]>([])
  const insets = useSafeAreaInsets()
  const { groupId } = useLocalSearchParams()
  const { session } = useAuth()

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

  useEffect(() => {
    const fetchMessages = async () => {
      if (!session || !groupId) {
        console.error("No session or groupId found")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const agent = new Agent(session)
        const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")

        // Fetch conversation details first
        const convoResponse = await proxy.chat.bsky.convo.getConvo({
          convoId: groupId as string
        })

        const convoData = convoResponse.data.convo
        console.log("Conversation data:", convoData)

        // Set conversation name and members
        if (convoData) {
          // For group chats, use the group name. For DMs, use the other user's name
          const otherMembers = convoData.members?.filter(
            member => member.did !== session.did
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
        const messagesResponse = await proxy.chat.bsky.convo.getMessages({
          convoId: groupId as string
        })

        const messagesData = messagesResponse.data.messages || []

        // Transform messages to GiftedChat format
        const transformedMessages = await Promise.all(messagesData.map(async msg => {
          // The sender is the current user if their DID matches the message sender
          const isSelf = msg.sender?.did === session.did;

          // check if we have an avatar for this user, if not, get it:
          if (!profileImages[msg.sender?.did]) {
            const profileImage = await getProfileImage(msg.sender?.did)
            setProfileImages(prev => ({ ...prev, [msg.sender?.did]: profileImage }))
          }

          // get the profile image for the sender:
          const profileImage = profileImages[msg.sender?.did] ?? `https://i.pravatar.cc/150?u=${msg.sender?.did}`

          return {
            _id: msg.id,
            text: msg.text,
            createdAt: new Date(msg.sentAt),
            user: {
              _id: msg.sender?.did || "unknown",
              name: isSelf ? "You" : (msg.sender?.displayName || msg.sender?.handle || "User"),
              avatar: profileImage
            },
          }
        }))

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

    fetchMessages()
    startMessageListener()
  }, [groupId, session])

  // Real-time message listener implementation
  const messageListenerRef = useRef<any>(null)

  const startMessageListener = async () => {
    if (!session || !groupId) return

    try {
      const agent = new Agent(session)
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat")

      // Implement real-time message subscription
      // This is a simplified example - actual implementation will depend on API capabilities
      messageListenerRef.current = setInterval(async () => {
        // Only check for new messages if we're not already loading
        if (loading || loadingMore) return

        try {
          // Get latest messages (assume API supports getting messages since a specific timestamp)
          const latestMessage = messagesRef.current[0]

          if (!latestMessage) return

          const newMessagesResponse = await proxy.chat.bsky.convo.getMessages({
            convoId: groupId as string,
            cursor: cursor ?? undefined,
            limit: 10
          })

          const newMessagesData = newMessagesResponse.data.messages || []

          console.log("newMessagesData.length", newMessagesData.length)

          if (newMessagesData.length > 0) {
            // Transform new messages
            const transformedNewMessages = newMessagesData.map(msg => {
              const isSelf = msg.sender?.did === session.did

              return {
                _id: msg.id,
                text: msg.text,
                createdAt: new Date(msg.sentAt),
                user: {
                  _id: msg.sender?.did || "unknown",
                  name: isSelf ? "You" : (msg.sender?.displayName || msg.sender?.handle || "User"),
                  avatar: msg.sender?.avatar || `https://i.pravatar.cc/150?u=${msg.sender?.did}`
                }
              }
            })

            // Prepend new messages
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
    if (!session || !groupId || newMessages.length === 0) {
      console.error("Cannot send message: missing session, groupId, or message")
      return
    }

    const messageText = newMessages[0].text

    // Optimistically update UI
    setMessages((previousMessages) => GiftedChat.append(previousMessages, newMessages))

    try {
      const agent = new Agent(session)
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
  }, [groupId, session, replyMessage])

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={{ backgroundColor: theme.colors.background }}
        renderActions={() => (
          <View style={{ height: 44, justifyContent: "center", alignItems: "center", left: 5 }}>
            <Ionicons name="add" color={theme.colors.palette.primary300} size={28} />
          </View>
        )}
      />
    )
  }

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
    backgroundImage = "https://images.unsplash.com/photo-1534841090574-cba2d662b62e?q=80&w=3987&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
  } else {
    backgroundImage = "https://images.unsplash.com/photo-1599435214324-d71096238079?q=80&w=3987&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
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
    <ImageBackground
      source={{ uri: backgroundImage }}
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        marginBottom: insets.bottom,
      }}>
      <Header title={translate("chatScreen:title", { name: convoName })} leftIcon="back" onLeftPress={() => router.back()} />
      <GiftedChat
        messages={messages}
        onSend={(messages: any) => onSend(messages)}
        onInputTextChanged={setText}
        user={{
          _id: session?.did || '1',
        }}
        renderSystemMessage={(props) => (
          <SystemMessage {...props} textStyle={{ color: theme.colors.palette.neutral300 }} />
        )}
        bottomOffset={insets.bottom}
        renderAvatar={() => (
          <Image
            source={{ uri: getConvoAvatar() }}
            style={{ width: 32, height: 32, borderRadius: 16 }}
          />
        )}
        maxComposerHeight={100}
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
            {text === "" && (
              <>
                <Ionicons name="camera-outline" color={theme.colors.palette.primary300} size={28} />
                <Ionicons name="mic-outline" color={theme.colors.palette.primary300} size={28} />
              </>
            )}
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
        renderInputToolbar={renderInputToolbar}
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
  )
}

const $composer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: "#fff",
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  paddingHorizontal: 10,
  paddingTop: 8,
  fontSize: 16,
  marginVertical: 4,
})

export default Page