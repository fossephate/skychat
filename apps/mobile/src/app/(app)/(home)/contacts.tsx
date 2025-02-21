import React, { useState, useEffect } from "react"
import { View, ViewStyle, TextStyle, Image, ImageStyle, TextInput, TouchableOpacity } from "react-native"
import { Button, Icon, ListView, Screen, Text, TextField } from "src/components"
import { colors, ThemedStyle } from "src/theme"
import { useStores } from "src/models"
import { Agent } from '@atproto/api'
import { useAppTheme } from "src/utils/useAppTheme"
import { ListItem } from "src/components/ListItem"
import { NewChatModal } from "@/components/Chat/NewChat"
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface User {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  description?: string
  verified?: boolean
  online?: boolean
}

export default function UsersScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const { authStore } = useStores()
  const { themed } = useAppTheme()
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState(false)

  const handleNewChat = (selectedUsers: string[]) => {
    // Handle the selected users here
    console.log('Selected users:', selectedUsers)
    // Add your logic to create a new chat
  }

  useEffect(() => {
    async function fetchFollowing() {
      const client = authStore.client;
      const session = authStore.session;
      if (!client || !session) return;
      try {
        const agent = new Agent(session);

        // Get the user's following list
        const following = await agent.getFollows({
          actor: session.did,
          limit: 100,
        })

        // Get detailed profiles for each followed user
        const profiles = await agent.getProfiles({
          actors: following.data.follows.map(f => f.did),
        })

        const formattedUsers: User[] = profiles.data.profiles.map(profile => ({
          did: profile.did,
          handle: profile.handle,
          displayName: profile.displayName || profile.handle,
          avatar: profile.avatar,
          description: profile.description,
          verified: profile.viewer?.muted !== true, // Just an example condition
          online: false, // We could implement real online status later
        }))

        setUsers(formattedUsers)
      } catch (error) {
        console.error('Error fetching following:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFollowing()
  }, [authStore.session])

  const filteredUsers = users.filter(
    user =>
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderUser = ({ item: user }: { item: User }) => (
    <ListItem
      LeftComponent={
        <View style={themed($avatarContainer)}>
          <Image
            source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
            style={themed($avatar)}
          />
          {user.online && <View style={themed($onlineBadge)} />}
        </View>
      }
      topSeparator={false}
      bottomSeparator
      height={72}
    >
      <View style={themed($userInfo)}>
        <Text text={user.displayName} size="xs" style={themed($userName)} numberOfLines={1} />
        {user.description && <Text text={user.description} size="xs" style={themed($userStatus)} numberOfLines={1} />}
      </View>
    </ListItem>
  )

  return (
    <>
      <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screenContainer)}>


        <View style={themed($header)}>
          <Text tx="contactsScreen:title" preset="heading" style={themed($headerText)} />
        </View>
        <View style={themed($searchContainer)}>
          <TextField
            style={themed($searchInput)}
            placeholderTx="contactsScreen:searchPlaceholder"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ListView
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item: any) => item.did}
          estimatedItemSize={72}
          contentContainerStyle={themed($listContent)}
          showsVerticalScrollIndicator={false}
        />
      </Screen>

      <NewChatModal
        isVisible={isNewChatModalVisible}
        onClose={() => setIsNewChatModalVisible(false)}
        onSubmit={handleNewChat}
      />

      <Button
        style={themed($fabButton)}
        onPress={() => setIsNewChatModalVisible(true)}
        LeftAccessory={() => <FontAwesome name="plus" size={24} color={colors.background} />}
      />
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

const $searchContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
})

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  height: 40,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.text,
})

const $listContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.lg,
})

const $userCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginBottom: spacing.xs,
})

const $userContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.xs,
})

const $avatarContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "relative",
  width: 44,
  height: 44,
  marginRight: spacing.md,
  justifyContent: "center",
  marginTop: "auto",
  marginBottom: "auto",
})

const $avatar: ThemedStyle<ImageStyle> = ({ colors }) => ({
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral300,
})

const $onlineBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  bottom: 0,
  right: 0,
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: "#4CAF50",
  borderWidth: 2,
  borderColor: colors.background,
})

const $userInfo: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flex: 1,
  marginLeft: spacing.sm,
})

const $nameRow: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
})

const $userName: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 15,
  fontWeight: "600",
  marginRight: spacing.xs,
})

const $verifiedBadge: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
  fontSize: 13,
  marginTop: 1,
})

const $userStatus: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 1,
})

const $followButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.primary500,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 15,
  marginLeft: spacing.sm,
})

const $followButtonText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.background,
  fontSize: 13,
  fontWeight: "600",
})

// Add the FAB button styles
const $fabButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: 'absolute',
  bottom: spacing.lg,
  right: spacing.lg,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.palette.primary500,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 4,
  // shadowColor: colors.palette.neutral900,
  // shadowOffset: { width: 0, height: 2 },
  // shadowOpacity: 0.25,
  // shadowRadius: 3.84,
})