
import { ListView, Text, Button, Icon, TextField } from "../../components"
import { ThemedStyle } from "../../theme"
import { useAppTheme } from "../../utils/useAppTheme"
import { ListItem } from "../../components/ListItem"
import React, { useState, useEffect, useCallback, useMemo } from "react"
import { View, ViewStyle, TextStyle, Image, ImageStyle, Modal, TouchableOpacity, Dimensions } from "react-native"
import { Agent } from '@atproto/api'
import debounce from 'lodash/debounce'
import { GestureHandlerRootView, ScrollView } from "react-native-gesture-handler"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Screen } from "../../components/Screen"
interface User {
  id: string
  handle: string
  displayName: string
  avatar?: string
  verified: boolean
  online: boolean
  description?: string
}

interface NewChatModalProps {
  isVisible: boolean
  onClose: () => void
  onSubmit: (groupName: string, selectedUsers: string[]) => void // Returns array of DIDs
  agent: Agent
}

export function NewChatModal({ isVisible, onClose, onSubmit, agent }: NewChatModalProps) {
  const [state, setState] = useState({
    searchQuery: "",
    groupName: "",
    users: [] as User[],
    selectedUsers: [] as User[],
    loading: false,
    error: "",
    isGlobalSearch: true,
  })

  const userDid = agent.assertDid;

  const { themed } = useAppTheme()

  // Get unselected users for main list
  const unselectedUsers = useMemo(() => {
    // return all users that are not in the selectedUsers array
    return state.users.filter(user => !state.selectedUsers.some(u => u.id === user.id))
  }, [state.users, state.selectedUsers])

  // Fetch following list on initial load
  useEffect(() => {
    if (isVisible) {
      fetchFollowing()
    }
    if (!isVisible) {
      setState({
        searchQuery: "",
        groupName: "",
        users: [],
        selectedUsers: [],
        loading: true,
        error: "",
        isGlobalSearch: true,
      })
    }
  }, [isVisible])

  const fetchFollowing = async () => {
    if (!agent || !userDid) return

    try {
      setState(prev => ({ ...prev, loading: true, error: "" }))

      const following = await agent.getFollows({
        actor: userDid,
        limit: 25,
      })

      const profiles = await agent.getProfiles({
        actors: following.data.follows.map(f => f.did),
      })

      let formattedUsers: User[] = profiles.data.profiles.map(profile => ({
        id: profile.did,
        handle: profile.handle,
        displayName: profile.displayName || profile.handle,
        description: profile.description,
        avatar: profile.avatar,
        verified: profile.viewer?.muted !== true,
        online: false,
      }))

      // filter out our own profile:
      formattedUsers = formattedUsers.filter(user => user.id !== userDid)

      setState(prev => ({
        ...prev,
        users: formattedUsers,
        loading: false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch following list',
        loading: false
      }))
    }
  }

  // Memoized search function
  const searchGlobal = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!query || query.length < 3 || !agent) return

        try {
          setState(prev => ({ ...prev, loading: true, error: "" }))

          const searchResults = await agent.searchActors({
            term: query,
            limit: 20,
          })

          if (!searchResults.data.actors.length) {
            setState(prev => ({ ...prev, users: [], loading: false }))
            return
          }

          const profiles = await agent.getProfiles({
            actors: searchResults.data.actors.map(a => a.did),
          })

          const formattedUsers: User[] = profiles.data.profiles.map(profile => ({
            id: profile.did,
            description: profile.description,
            handle: profile.handle,
            displayName: profile.displayName || profile.handle,
            avatar: profile.avatar,
            verified: profile.viewer?.muted !== true,
            online: false,
          }))

          setState(prev => ({
            ...prev,
            users: formattedUsers,
            loading: false
          }))
        } catch (error) {
          setState(prev => ({ ...prev, users: [], loading: false }))
        }
      }, 300),
    [agent]
  )

  // // Cleanup debounce on unmount
  // useEffect(() => {
  //   return () => {
  //     searchGlobal.cancel()
  //   }
  // }, [searchGlobal])

  useEffect(() => {
    if (state.isGlobalSearch && state.searchQuery.length >= 3) {
      searchGlobal(state.searchQuery)
    }
  }, [state.searchQuery, state.isGlobalSearch])

  const toggleUserSelection = (did: string) => {
    console.log("toggleUserSelection", did)
    const userToAdd = state.users.find(user => user.id === did);
    console.log("userToAdd", userToAdd)
    if (userToAdd) {
      setState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== did),
        selectedUsers: [...prev.selectedUsers, userToAdd],
      }))
    } else {
      const userToRemove = state.selectedUsers.find(user => user.id === did);
      if (userToRemove) {
        setState(prev => ({
          ...prev,
          selectedUsers: prev.selectedUsers.filter(user => user.id !== did),
          users: [...prev.users, userToRemove],
        }))
      }
    }
  }

  const handleSubmit = useCallback(() => {
    onSubmit(state.groupName, state.selectedUsers.map(user => user.id))
    onClose()
  }, [state.selectedUsers, state.groupName, onSubmit, onClose])

  const renderSmallUsers = useCallback(({ item: user }: { item: User }) => {
    return (
      <ListItem
        style={themed($smallUserListItem)}
        LeftComponent={
          <Image
            source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
            style={themed($smallAvatar)}
            accessible
            accessibilityLabel={`${user.displayName}'s avatar`}
          />
        }
        onPress={() => toggleUserSelection(user.id)}
        topSeparator={false}
        bottomSeparator
        height={24}
        accessibilityRole="button"
        accessibilityLabel={`Unselect ${user.displayName}`}
      >
        <View style={themed($smallUserInfo)}>
          <Text
            text={user.displayName}
            size="xxs"
            style={themed($userName)}
            numberOfLines={1}
          />
        </View>
      </ListItem>
    )
  }, [themed, toggleUserSelection])

  const renderUnselectedUser = useCallback(({ item: user }: { item: User }) => {
    return (
      <ListItem
        LeftComponent={
          <Image
            source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
            style={themed($avatar)}
            accessible
            accessibilityLabel={`${user.displayName}'s avatar`}
          />
        }
        onPress={() => toggleUserSelection(user.id)}
        topSeparator={false}
        bottomSeparator
        height={72}
        accessibilityRole="button"
        accessibilityLabel={`Select ${user.displayName}`}
      >
        <View style={themed($userInfo)}>
          <Text
            text={user.displayName}
            size="xs"
            style={themed($userName)}
            numberOfLines={1}
            accessibilityRole="header"
          />
          {user.description && (
            <Text
              text={user.description}
              size="xs"
              style={themed($userStatus)}
              numberOfLines={1}
            />
          )}
        </View>
      </ListItem>
    )
  }, [themed, toggleUserSelection])

  // get safe area insets
  const insets = useSafeAreaInsets();

  let dmText = "New DM"
  let groupText = "New Group"
  let newText;
  if (state.selectedUsers.length === 1) {
    newText = dmText
  } else if (state.selectedUsers.length > 1) {
    newText = groupText
  }


  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[themed($modalContainer), { paddingTop: insets.top }]}>
        <GestureHandlerRootView>
          <Screen
            preset="fixed"
            contentContainerStyle={themed($screenContainer)}
          >
            <View style={themed($header)}>
              <TouchableOpacity
                onPress={onClose}
                style={themed($closeButton)}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
              >
                <Icon icon="x" size={24} />
              </TouchableOpacity>
              <Text
                tx="newChat:title"
                preset="heading"
                style={themed($headerText)}
                accessibilityRole="header"
              />
              {state.selectedUsers.length > 0 ? (
                <Button
                  text={newText}
                  preset="reversed"
                  onPress={handleSubmit}
                  style={themed($submitButton)}
                  disabled={!state.selectedUsers.length}
                />
              ) : <></>}
            </View>

            <View style={themed($searchContainer)}>
              <TextField
                style={themed($searchInput)}
                placeholderTx="newChat:searchPlaceholder"
                value={state.searchQuery}
                onChangeText={(text) => setState(prev => ({ ...prev, searchQuery: text }))}
                accessibilityLabel="Search users"
              />
            </View>

            <View style={themed($listsContainer)}>
              {state.selectedUsers.length > 0 && (
                <View style={themed($selectedUsersContainer)}>
                  <ScrollView
                    horizontal={false}
                    contentContainerStyle={themed($selectedUsersListContainer)}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={themed($selectedUsersGrid)}>
                      {state.selectedUsers.map(user => (
                        <React.Fragment key={`selected-${user.id}`}>
                          {renderSmallUsers({ item: user })}
                        </React.Fragment>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              <View style={themed($availableUsersContainer)}>
                {state.selectedUsers.length > 0 && (
                  <Text
                    text="Available Users"
                    style={themed($sectionHeader)}
                    accessibilityRole="header"
                  />
                )}
                {unselectedUsers.length > 0 || state.loading ? (
                  <ListView
                    data={unselectedUsers}
                    renderItem={renderUnselectedUser}
                    keyExtractor={(item: User) => item.id}
                    estimatedItemSize={72}
                    showsVerticalScrollIndicator={false}
                    refreshing={state.loading}
                    onRefresh={fetchFollowing}
                  />
                ) : (
                  <Text
                    text="No users found"
                    style={themed($errorText)}
                  />
                )}
              </View>
            </View>

            <View style={themed($footer)}>
              {state.selectedUsers.length > 0 && (
                <TextField
                  style={themed($searchInput)}
                  placeholderTx="newChat:groupNamePlaceholder"
                  value={state.groupName}
                  onChangeText={(text) => setState(prev => ({ ...prev, groupName: text }))}
                />
              )}
              {/* <Button
              tx="newChat:createGroupButton"
              preset="reversed"
              onPress={handleSubmit}
              style={themed($submitButton)}
              disabled={!state.selectedUserIds.length}
              accessibilityLabel="Create group chat"
              accessibilityState={{ disabled: !state.selectedUserIds.length }}
            /> */}
            </View>

          </Screen>
        </GestureHandlerRootView>
      </View>
    </Modal>
  )
}

const $modalContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
})

const $closeButton: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginRight: spacing.sm,
})

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 24,
  color: colors.text,
})

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
  gap: spacing.sm,
})

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  flex: 1,
  height: 36,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.text,
  marginRight: spacing.sm,
  textAlignVertical: 'center',
})

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  textAlign: 'center',
  padding: spacing.md,
})

const $listsContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  flexGrow: 1,
  minHeight: 0,
  display: 'flex',
})

const $availableUsersContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingHorizontal: spacing.lg,
})

const $sectionHeader: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  fontWeight: '600',
  color: colors.textDim,
  paddingVertical: spacing.sm,
})

const $avatar: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: colors.palette.neutral300,
  marginRight: spacing.md,
  justifyContent: "center",
  marginTop: "auto",
  marginBottom: "auto",
})

const $checkboxContainer: ThemedStyle<ViewStyle> = () => ({
  justifyContent: 'center',
  height: '100%',
})

const $userInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginLeft: spacing.sm,
})

const $userName: ThemedStyle<TextStyle> = ({ spacing }) => ({
  fontSize: 15,
  fontWeight: "600",
  marginRight: spacing.xs,
})

const $userStatus: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  marginTop: 1,
})

const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: spacing.lg,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  flexDirection: 'column',
  gap: spacing.xl,
})

const $submitButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  backgroundColor: colors.palette.primary500,
})


// small avatar for selected users list:


const $selectedUsersContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  height: 120,
})

const $selectedUsersListContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
})

const $selectedUsersGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: spacing.xs,
})

const $smallAvatar: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  width: 20,
  height: 20,
  marginTop: "auto",
  marginBottom: "auto",
  marginRight: spacing.xs,
})

const $smallUserListItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral500,
  borderRadius: 20,
  paddingHorizontal: spacing.xs,
  // height: 16,
})

const $smallUserInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // flex: 1,
  // marginLeft: spacing.sm,
})
