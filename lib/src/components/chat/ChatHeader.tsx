import React from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { Text } from "@/components"
import { colors, spacing } from "@/theme"
import FontAwesome from '@expo/vector-icons/FontAwesome'

interface ChatHeaderProps {
  title: string
}

export function ChatHeader({ title,  }: ChatHeaderProps) {

  return (
    <View style={$headerContainer}>
      <View style={$leftContainer}>
        <FontAwesome
          name="chevron-left"
          size={20}
          color={colors.text}
          style={$backButton}
        />
        <Text text={title} preset="heading" style={$title} />
      </View>
        <FontAwesome
          name="ellipsis-h"
          size={24}
          color={colors.text}
          style={$infoButton}
        />
    </View>
  )
}

const $headerContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  backgroundColor: colors.background,
}

const $leftContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  flex: 1,
}

const $backButton: ViewStyle = {
  padding: spacing.xs,
}

const $title: TextStyle = {
  marginLeft: spacing.sm,
}

const $infoButton: ViewStyle = {
  padding: spacing.xs,
}
