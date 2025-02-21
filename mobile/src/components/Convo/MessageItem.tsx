import React from "react"
import { View, ViewStyle, TextStyle } from "react-native"
import { Text } from "@/components"
import { colors, spacing } from "@/theme"

interface MessageProps {
  message: {
    text: string
    sender: "me" | "them"
    timestamp: string
  }
}

export function Message({ message }: MessageProps) {
  const isMe = message.sender === "me"
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <View style={[$messageContainer, isMe ? $messageContainerRight : $messageContainerLeft]}>
      <View style={[$messageBubble, isMe ? $messageBubbleMe : $messageBubbleThem]}>
        <Text
          text={message.text}
          style={[isMe ? $messageTextMe : $messageTextThem]}
        />
        <Text
          text={time}
          size="xs"
          style={[$timestamp, isMe ? $timestampMe : $timestampThem]}
        />
      </View>
    </View>
  )
}

const $messageContainer: ViewStyle = {
  marginVertical: spacing.xs,
  flexDirection: "row",
}

const $messageContainerLeft: ViewStyle = {
  justifyContent: "flex-start",
}

const $messageContainerRight: ViewStyle = {
  justifyContent: "flex-end",
}

const $messageBubble: ViewStyle = {
  maxWidth: "80%",
  padding: spacing.sm,
  borderRadius: 12,
  flexDirection: "row",
  alignItems: "flex-end",
}

const $messageBubbleMe: ViewStyle = {
  backgroundColor: colors.tint,
  borderBottomRightRadius: 4,
}

const $messageBubbleThem: ViewStyle = {
  backgroundColor: colors.palette.secondary200,
  borderBottomLeftRadius: 4,
}

const $messageTextMe: TextStyle = {
  color: colors.palette.neutral100,
  flex: 1,
}

const $messageTextThem: TextStyle = {
  color: colors.text,
  flex: 1,
}

const $timestamp: TextStyle = {
  marginLeft: spacing.xs,
}

const $timestampMe: TextStyle = {
  color: colors.palette.neutral200,
}

const $timestampThem: TextStyle = {
  color: colors.palette.neutral600,
} 