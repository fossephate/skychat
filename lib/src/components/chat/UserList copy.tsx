import {
  Alert,
  ImageStyle,
  RefreshControl,
  TextStyle,
  View,
  ViewStyle,
  Image,
  TouchableOpacity,
} from "react-native"
import { ListView } from "../ListView"
import { ListItem } from "../ListItem"
import { useCallback, useEffect } from "react"
import { useState } from "react"
import { Agent } from "@atproto/api"
import { useAppTheme } from "../../utils/useAppTheme"
import { TextField } from "../TextField"
import { ThemedStyle } from "../../theme"
import { Text } from "../Text"
import { Button } from "../Button"
import { NewChatModal } from "./NewChat"
import { FontAwesome } from "@expo/vector-icons"

interface User {
  did: string
  handle: string
  displayName?: string
  avatar?: string
  description?: string
  verified?: boolean
  online?: boolean
}

interface UserListProps {
  agent: Agent
  onChatPress?: (groupId: string) => void
  onProfilePress?: (did: string) => void
}

export const UserList = ({ agent, onChatPress, onProfilePress }: UserListProps) => {
  const [searchQuery, setSearchQuery] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { themed } = useAppTheme()
  const [isNewChatModalVisible, setIsNewChatModalVisible] = useState(false)

  const userDid = agent.assertDid

  const fetchFollowing = useCallback(async () => {
    try {
      // Get the user's following list
      const following = await agent.getFollows({
        actor: userDid,
        limit: 25,
      })

      // Get detailed profiles for each followed user
      const profiles = await agent.getProfiles({
        actors: following.data.follows.map((f) => f.did),
      })

      const formattedUsers: User[] = profiles.data.profiles.map((profile) => ({
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
      console.error("Error fetching following:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [agent])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchFollowing()
  }, [fetchFollowing])

  const handleNewChat = async (groupName: string, selectedUsers: string[]) => {
    if (groupName === "") {
      // random group name
      groupName = "Group " + Math.floor(Math.random() * 1000000)
    }
    console.log("Group name:", groupName)
    console.log("getting groups with users: ", selectedUsers)

    // try {
    //   let allMembers = [...selectedUsers, convoContext.client!.id]
    //   const groupId = await convoContext.getGroupIdWithUsers(allMembers)
    //   console.log("group with these users: ", groupId)
    //   if (!groupId) {
    //     throw new Error("No group id found")
    //   }
    //   router.push(`/chats/${groupId}`)
    //   return
    // } catch (error) {
    //   console.log("No group found with these users, creating new group" + error)
    // }

    // try {
    //   const encodedGroupId = await convoContext.createGroupWithUsers(groupName, selectedUsers)
    //   if (!encodedGroupId) {
    //     throw new Error("No group id found")
    //   }
    //   console.log(`contacts.tsx: created group!: ${groupName} (${encodedGroupId})`)
    //   router.push(`/chats/${encodedGroupId}` as any)
    //   onChatPress?.(encodedGroupId)
    // } catch (error) {
    //   // console.log("error creating group: ", error)
    //   // console.error('Error creating chat:', error)
    //   // pop up an error modal:
    //   Alert.alert("Error creating chat", "This user is not on Skychat (yet!)")
    // }
    // Alert.alert('Success', 'This user is not on Skychat (yet!)')
  }

  // const handleCreateDm = (user: User) => {
  // TODO: check if we have a group with this user already:
  // if we do, open it
  // if we don't, create it
  // convoContext.createDm(userId)
  // for now assume we don't have a group with this user already:
  // handleNewChat(`${user.handle}`, [user.did])
  // }

  useEffect(() => {
    fetchFollowing()
  }, [fetchFollowing])

  const filteredUsers = users.filter(
    (user) =>
      user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const renderUser = ({ item: user }: { item: User }) => (
    <ListItem
      LeftComponent={
        <View style={themed($avatarContainer)}>
          <TouchableOpacity onPress={() => onProfilePress?.(user.did)}>
            <Image
              source={{ uri: user.avatar || "https://i.pravatar.cc/150" }}
              style={themed($avatar)}
            />
            {user.online && <View style={themed($onlineBadge)} />}
          </TouchableOpacity>
        </View>
      }
      topSeparator={false}
      bottomSeparator
      height={72}
      onPress={() => onChatPress?.(user.did)}
    >
      <View style={themed($userInfo)}>
        <TouchableOpacity onPress={() => onChatPress?.(user.did)}>
          <Text text={user.displayName} size="xs" style={themed($userName)} numberOfLines={1} />
          {user.description && (
            <Text text={user.description} size="xs" style={themed($userStatus)} numberOfLines={1} />
          )}
        </TouchableOpacity>
      </View>
    </ListItem>
  )

  return (
    <View style={{ flex: 1 }}>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />

      <NewChatModal
        isVisible={isNewChatModalVisible}
        onClose={() => setIsNewChatModalVisible(false)}
        onSubmit={handleNewChat}
        agent={agent}
      />

      <Button
        style={themed($fabButton)}
        onPress={() => setIsNewChatModalVisible(true)}
        LeftAccessory={() => <FontAwesome name="plus" size={24} />}
      />
    </View>
  )
}

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
  textAlignVertical: "center",
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

// Add the FAB button styles
const $fabButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "absolute",
  bottom: spacing.lg,
  right: spacing.lg,
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: colors.palette.primary500,
  justifyContent: "center",
  alignItems: "center",
  elevation: 4,
})
