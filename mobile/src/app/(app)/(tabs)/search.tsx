import React, { useState, useEffect, useCallback } from "react"
import { View, ViewStyle, TextStyle, Image, ImageStyle, Alert } from "react-native"
import { Button, Screen, Text } from "src/components"
import { colors, ThemedStyle } from "src/theme"
import { Agent } from '@atproto/api'
import { useAppTheme } from "src/utils/useAppTheme"
import { ListItem } from "src/components/ListItem"
import { NewChatModal, SearchCreate } from "skychat-lib"
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useAuth } from "@/contexts/AuthContext"
import { router } from "expo-router"

export default function UsersScreen() {

  const { themed } = useAppTheme();
  const { session } = useAuth()

  if (!session) {
    console.error("No session found")
    router.push("/login")
    return <></>
  }

  const agent = new Agent(session)

  const handleChatPress = (did: string) => {
    // router.push(`/chats/${groupId}`)
    console.log("handleChatPress", did);
    // TODO: figure out how to best handle this
  }

  const handleProfilePress = (did: string) => {
    router.push(`/profile/${did}`)
  }

  return (
    <>
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screenContainer)}>

        {/* <View style={themed($header)}>
          <Text tx="searchScreen:title" preset="heading" style={themed($headerText)} />
        </View> */}

        <SearchCreate agent={agent} onChatPress={handleChatPress} onProfilePress={handleProfilePress} />

      </Screen>
    </>
  )
}

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
})

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 32,
  color: colors.text,
})

