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
  const [convoName, setConvoName] = useState("")
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
  const [profileImages, setProfileImages] = useState<Record<string, string>>({})

  const getProfileImage = async (did: string) => {
    if (!session) return
    const agent = new Agent(session)
    const profile = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: "app.bsky.actor.profile",
      rkey: "self",
    })
    // @ts-ignore - Handling potential type issues
    const avatarUri = profile.data.value.avatar
    console.log(avatarUri)
    return avatarUri || undefined
  }

  let backgroundImage
  if (theme.isDark) {
    backgroundImage = require("assets/images/splash-dark.png")
  } else {
    backgroundImage = require("assets/images/splash.png")
  }

  let chatTitle = convoName != "" ? translate("chatScreen:title", { name: convoName }) : ""

  return (
    <Screen
      preset="fixed"
      contentContainerStyle={themed($screenContainer)}
      safeAreaEdges={["bottom"]}
    >
      {/* // <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingBottom: insets.bottom }}> */}
      <ImageBackground
        source={backgroundImage}
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        <Header title={chatTitle} leftIcon="back" onLeftPress={() => router.back()} />
        <BskyChat agent={agent} groupId={groupId as string} refreshInterval={10000} />
      </ImageBackground>
      {/* </View> */}
    </Screen>
  )
}

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})
