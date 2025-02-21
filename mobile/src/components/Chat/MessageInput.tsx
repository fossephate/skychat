import React, { useState } from "react"
import { View, TextInput, TouchableOpacity, ViewStyle, Platform } from "react-native"
import { colors, spacing } from "@/theme"
import * as ImagePicker from "expo-image-picker"
import { MaterialIcons } from "@expo/vector-icons"

interface MessageInputProps {
  onSendMessage: (text: string, attachments?: ImagePicker.ImagePickerAsset[]) => void
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
  const [messageText, setMessageText] = useState("")
  const [attachments, setAttachments] = useState<ImagePicker.ImagePickerAsset[]>([])

  const handleSend = () => {
    if (messageText.trim() || attachments.length > 0) {
      onSendMessage(messageText, attachments)
      setMessageText("")
      setAttachments([])
    }
  }

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    
    if (permissionResult.granted === false) {
      alert("Permission to access camera roll is required!")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 1,
    })

    if (!result.canceled) {
      setAttachments([...attachments, ...result.assets])
    }
  }

  return (
    <View style={$inputContainer}>
      <TouchableOpacity onPress={handlePickImage} style={$iconButton}>
        <MaterialIcons name="attach-file" size={24} color={colors.text} />
      </TouchableOpacity>
      
      <TextInput
        style={$textInput}
        value={messageText}
        onChangeText={setMessageText}
        placeholder="Type a message..."
        placeholderTextColor={colors.textDim}
        multiline
      />
      
      <TouchableOpacity 
        onPress={handleSend}
        style={[
          $iconButton,
          $sendButton,
          (!messageText.trim() && !attachments.length) && $sendButtonDisabled
        ]}
        disabled={!messageText.trim() && !attachments.length}
      >
        <MaterialIcons 
          name="send" 
          size={24} 
          color={(!messageText.trim() && !attachments.length) ? colors.textDim : colors.tint} 
        />
      </TouchableOpacity>
    </View>
  )
}

const $inputContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.separator,
  backgroundColor: colors.background,
}

const $textInput: ViewStyle = {
  flex: 1,
  minHeight: 40,
  maxHeight: 120,
  marginHorizontal: spacing.xs,
  paddingHorizontal: spacing.sm,
  paddingVertical: spacing.xs,
  backgroundColor: colors.backgroundDim,
  borderRadius: 20,
  color: colors.text,
}

const $iconButton: ViewStyle = {
  padding: spacing.xs,
  justifyContent: "center",
  alignItems: "center",
}

const $sendButton: ViewStyle = {
  backgroundColor: colors.transparent,
}

const $sendButtonDisabled: ViewStyle = {
  opacity: 0.5,
}