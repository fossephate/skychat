import { Ionicons } from "@expo/vector-icons"
import messageData from "assets/data/messages.json"
import { ThemedStyle } from "@/theme"

import { BskyChat, ChatMessageBox, ReplyMessageBar } from "skychat-lib"
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


export default function Page() {
  const [messages, setMessages] = useState<IMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [convoName, setConvoName] = useState("Chat")
  const [convoMembers, setConvoMembers] = useState<any[]>([])
  const insets = useSafeAreaInsets()
  const { session } = useAuth()
  const { groupId } = useLocalSearchParams()

  if (!session) {
    console.error("No session found")
    router.push("/login")
    return <></>
  }

  const agent = new Agent(session)

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

  const fetchMessages = async () => {
    if (!session) {
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

  return (
    <Screen preset="fixed" contentContainerStyle={themed($screenContainer)} safeAreaEdges={["bottom"]}>
      {/* // <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingBottom: insets.bottom }}> */}
      <ImageBackground
        source={backgroundImage}
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}>
        <Header title={translate("chatScreen:title", { name: convoName })} leftIcon="back" onLeftPress={() => router.back()} />
        <BskyChat
          agent={agent}
          groupId={groupId as string}
          refreshInterval={10000}
        />
      </ImageBackground>
      {/* </View> */}
    </Screen>
  )
}

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})