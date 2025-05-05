import {
  ImageStyle,
  TextStyle,
  View,
  ViewStyle,
  Image,
  TouchableOpacity,
  StyleProp,
  Alert,
} from 'react-native';
import { ListView } from '../ListView';
import { ListItem } from '../ListItem';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useState } from 'react';
import { Agent } from '@atproto/api';
import { useAppTheme } from '../../utils/useAppTheme';
import { TextField } from '../TextField';
import { ThemedStyle, ThemedStyleArray } from '../../theme';
import { Text } from '../Text';
import { Button } from '../Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import debounce from 'lodash/debounce';
import { ScrollView } from 'react-native-gesture-handler';
import React from 'react';

import {
  $avatar,
  $avatarContainer,
  $userInfo,
  $userName,
  $userHandle,
  $userStatus,
  $userStatusError,
} from './styles';
import { canBeMessaged, check, isVerified, isVerifier } from '../utils/utils';
import { useStrings } from '../../contexts/strings';
import { SheetManager } from 'react-native-actions-sheet';

interface User {
  id: string;
  handle: string;
  displayName: string;
  avatar?: string;
  verified: boolean;
  verifier: boolean;
  online: boolean;
  description?: string;
  canBeMessaged: boolean;
}

interface SearchCreateProps {
  agent: Agent;
  onChatPress?: (groupId: string) => void;
  onProfilePress?: (did: string) => void;
  profileLongPressOverride?: (did: string) => void;
  onSubmit?: (ids: string[]) => void;
  themedOverride?: <T>(
    styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>
  ) => T;
}

export const SearchCreate = ({
  agent,
  onChatPress,
  onProfilePress,
  themedOverride,
  onSubmit,
  profileLongPressOverride,
}: SearchCreateProps) => {
  const s = useStrings();
  const [state, setState] = useState({
    searchQuery: '',
    groupName: '',
    users: [] as User[],
    selectedUsers: [] as User[],
    loading: false,
    error: '',
  });

  const selectedUsersListRef = useRef<ScrollView>(null);

  const userDid = agent.assertDid;

  let { themed } = useAppTheme();
  if (themedOverride) {
    themed = themedOverride;
  }

  const insets = useSafeAreaInsets();

  // Get unselected users for main list
  const unselectedUsers = useMemo(() => {
    // return all users that are not in the selectedUsers array
    return state.users.filter(
      (user) => !state.selectedUsers.some((u) => u.id === user.id)
    );
  }, [state.users, state.selectedUsers]);

  useEffect(() => {
    if (state.selectedUsers.length < 1) {
      return;
    }

    let XUser = {
      id: 'X',
      handle: 'X',
      displayName: 'X',
      avatar: 'X',
      description: 'X',
      verified: true,
      online: true,
      verifier: true,
      canBeMessaged: true,
    };

    // if selectedUsers contains more than 1 user, and we don't already have the X user, add them to the selectedUsers array
    if (!state.selectedUsers.some((u) => u.id === 'X')) {
      setState((prev) => ({
        ...prev,
        selectedUsers: [...prev.selectedUsers, XUser],
      }));
      return;
    }

    // if the only user is the X user, clear the selectedUsers array
    if (
      state.selectedUsers.length === 1 &&
      state.selectedUsers[0]!.id === 'X'
    ) {
      setState((prev) => ({
        ...prev,
        selectedUsers: [],
      }));
      return;
    }

    let lastUser = state.selectedUsers[state.selectedUsers.length - 1]!;
    // if the x user is in the array and it's not last, move it to the end of the array
    if (lastUser.id !== 'X') {
      setState((prev) => ({
        ...prev,
        selectedUsers: [
          ...prev.selectedUsers.filter((u) => u.id !== 'X'),
          XUser,
        ],
      }));
      setTimeout(() => {
        // scroll to the end of the list
        selectedUsersListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return;
    }
  }, [state.selectedUsers]);

  // Fetch following list on initial load
  useEffect(() => {
    fetchMutuals();
  }, []);

  const fetchMutuals = async () => {
    if (!agent || !userDid) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: '' }));

      const mutuals = await agent.app.bsky.graph.getKnownFollowers({
        actor: userDid,
        limit: 25,
      });

      let formattedUsers: User[] = mutuals.data.followers.map((profile) => ({
        id: profile.did,
        handle: profile.handle,
        displayName: profile.displayName || profile.handle,
        description: profile.description,
        avatar: profile.avatar,
        verified: isVerified(profile.verification),
        verifier: isVerifier(profile.verification),
        online: false,
        canBeMessaged: canBeMessaged(profile),
      }));

      // filter out our own profile:
      formattedUsers = formattedUsers.filter((user) => user.id !== userDid);

      setState((prev) => ({
        ...prev,
        users: formattedUsers,
        loading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to fetch following list',
        loading: false,
      }));
    }
  };

  // Memoized search function
  const searchGlobal = useMemo(
    () =>
      debounce(async (query: string) => {
        if (!agent) return;
        if (!query) {
          fetchMutuals();
          return;
        }

        try {
          setState((prev) => ({ ...prev, loading: true, error: '' }));

          const searchResults = await agent.searchActors({
            term: query,
            limit: 20,
          });

          if (!searchResults.data.actors.length) {
            setState((prev) => ({ ...prev, users: [], loading: false }));
            return;
          }

          const profiles = await agent.getProfiles({
            actors: searchResults.data.actors.map((a) => a.did),
          });

          const formattedUsers: User[] = profiles.data.profiles.map(
            (profile) => ({
              id: profile.did,
              description: profile.description,
              handle: profile.handle,
              displayName: profile.displayName || profile.handle,
              avatar: profile.avatar,
              verified: isVerified(profile.verification),
              verifier: isVerifier(profile.verification),
              online: false,
              canBeMessaged: canBeMessaged(profile),
            })
          );

          setState((prev) => ({
            ...prev,
            users: formattedUsers,
            loading: false,
          }));
        } catch (error) {
          setState((prev) => ({ ...prev, users: [], loading: false }));
        }
      }, 300),
    [agent]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      searchGlobal.cancel();
    };
  }, [searchGlobal]);

  useEffect(() => {
    searchGlobal(state.searchQuery);
  }, [state.searchQuery]);

  const toggleUserSelection = (did: string) => {
    if (did === 'X') {
      // clear the selectedUsers array
      setState((prev) => ({
        ...prev,
        loading: true,
        selectedUsers: [],
      }));
      fetchMutuals();
      return;
    }

    const userToAdd = state.users.find((user) => user.id === did);
    if (userToAdd) {
      setState((prev) => ({
        ...prev,
        users: prev.users.filter((user) => user.id !== did),
        selectedUsers: [...prev.selectedUsers, userToAdd],
      }));
    } else {
      const userToRemove = state.selectedUsers.find((user) => user.id === did);
      if (userToRemove) {
        setState((prev) => ({
          ...prev,
          selectedUsers: prev.selectedUsers.filter((user) => user.id !== did),
          users: [...prev.users, userToRemove],
        }));
      }
    }
  };

  const handleSubmit = useCallback(() => {
    const userIds = state.selectedUsers.map((user) => user.id).filter((id) => id !== 'X');
    if (userIds.length > 1) {
      // show alert: group chats are not supported yet
      Alert.alert('Group chats coming soon!');
      return;
    }
    onSubmit?.(userIds);
  }, [state.selectedUsers, state.groupName]);

  const renderSmallUsers = useCallback(
    ({ item: user }: { item: User }) => {
      if (user.id === 'X') {
        return (
          <ListItem
            style={themed($smallUserClearButton)}
            onPress={() => toggleUserSelection(user.id)}
            height={24}
          >
            <View style={themed($smallUserInfo)}>
              <Text
                text={'Clear'}
                size="xxs"
                style={[themed($userName), { paddingLeft: 10 }]}
                numberOfLines={1}
              />
            </View>
          </ListItem>
        );
      }

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
      );
    },
    [themed, toggleUserSelection]
  );

  const handleProfileLongPress = (did: string) => {
    if (profileLongPressOverride) {
      profileLongPressOverride(did);
      return;
    }

    // SheetManager.show('profileActionsSheet', {
    //   payload: { agent, did },
    // });
  };

  const renderUnselectedUser = useCallback(
    ({ item: user }: { item: User }) => {
      return (
        <ListItem
          style={!user.canBeMessaged && { opacity: 0.8 }}
          onLongPress={() => handleProfileLongPress?.(user.id)}
          LeftComponent={
            <View style={themed($avatarContainer)}>
              <TouchableOpacity onPress={() => onProfilePress?.(user.id)}>
                <Image
                  source={{ uri: user.avatar || 'https://i.pravatar.cc/150' }}
                  style={themed($avatar)}
                  accessible
                  accessibilityLabel={`${user.displayName}'s avatar`}
                />
              </TouchableOpacity>
            </View>
          }
          onPress={
            user.canBeMessaged ? () => toggleUserSelection(user.id) : undefined
          }
          bottomSeparator
          height={72}
          accessibilityRole="button"
          accessibilityLabel={`Select ${user.displayName}`}
        >
          <View style={themed($userInfo)}>
            <View style={{ flexDirection: 'row' }}>
              <Text
                text={user.displayName}
                size="xs"
                style={themed($userName)}
                numberOfLines={1}
                accessibilityRole="header"
              />
              {check(user.verified, user.verifier)}
            </View>
            {user.handle && (
              <Text
                text={`@${user.handle}`}
                size="xxs"
                style={themed($userHandle)}
                numberOfLines={1}
              />
            )}
            {user.description && (
              <Text
                text={user.description}
                size="xs"
                style={themed($userStatus)}
                numberOfLines={1}
              />
            )}
            {!user.canBeMessaged && (
              <Text
                text={s('cantBeMessaged')}
                size="xxs"
                style={themed($userStatusError)}
              />
            )}
          </View>
        </ListItem>
      );
    },
    [themed, toggleUserSelection]
  );

  let dmText = 'New DM';
  let groupText = 'New Group';
  let newText;
  if (state.selectedUsers.length <= 2) {
    newText = dmText;
  } else if (state.selectedUsers.length > 2) {
    newText = groupText;
  }

  return (
    <View style={themed($container)}>
      <View style={themed($footer)}>
        <View style={themed($searchButtonContainer)}>
          <TextField
            style={themed($searchInput)}
            containerStyle={themed($searchContainer)}
            inputWrapperStyle={themed($searchInputWrapper)}
            placeholder="Search..."
            value={state.searchQuery}
            onChangeText={(text) =>
              setState((prev) => ({ ...prev, searchQuery: text }))
            }
            accessibilityLabel="Search users"
          />
          {state.selectedUsers.length > 0 && (
            <Button
              text={newText}
              preset="reversed"
              onPress={handleSubmit}
              style={themed($submitButton)}
              textStyle={themed($submitButtonText)}
              disabled={!state.selectedUsers.length}
            />
          )}
        </View>
      </View>
      <View style={themed($listsContainer)}>
        {state.selectedUsers.length > 0 && (
          <View style={themed($selectedUsersContainer)}>
            <ScrollView
              horizontal={false}
              contentContainerStyle={themed($selectedUsersListContainer)}
              showsVerticalScrollIndicator={false}
              ref={selectedUsersListRef}
            >
              <View style={themed($selectedUsersGrid)}>
                {state.selectedUsers.map((user) => (
                  <React.Fragment key={`selected-${user.id}`}>
                    {renderSmallUsers({ item: user })}
                  </React.Fragment>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={themed($availableUsersContainer)}>
          {unselectedUsers.length > 0 || state.loading ? (
            <ListView
              data={unselectedUsers}
              renderItem={renderUnselectedUser}
              keyExtractor={(item: User) => item.id}
              estimatedItemSize={72}
              showsVerticalScrollIndicator={false}
              refreshing={state.loading}
              onRefresh={fetchMutuals}
            />
          ) : (
            <Text text="No users found" style={themed($errorText)} />
          )}
        </View>
      </View>
    </View>
  );
};

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
  color: colors.text,
});

const $searchButtonContainer: ThemedStyle<ViewStyle> = ({
  spacing,
  colors,
}) => ({
  paddingHorizontal: spacing.lg,
  backgroundColor: colors.palette.neutral200,
});

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  // color: colors.text,
  // backgroundColor: colors.palette.neutral300,
});

const $searchInputWrapper: ThemedStyle<ViewStyle> = ({ spacing, colors }) => ({
  backgroundColor: colors.palette.neutral300,
  color: colors.text,
  borderRadius: 20,
});

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  height: 24,
  backgroundColor: colors.palette.neutral300,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.text,
  marginRight: spacing.sm,
  textAlignVertical: 'center',
  width: '100%',
});

const $errorText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.error,
  textAlign: 'center',
  padding: spacing.md,
});

const $listsContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  flexGrow: 1,
  minHeight: 0,
  display: 'flex',
});

const $availableUsersContainer: ThemedStyle<ViewStyle> = ({
  spacing,
  colors,
}) => ({
  flex: 1,
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.md,
  borderBottomColor: colors.separator,
});

const $footer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral200,
  flexDirection: 'column',
  // gap: spacing.xl,
});

const $submitButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.primary500,
  // width: 130,
  marginTop: spacing.lg,
  height: 44,
  minHeight: 44,
  // marginBottom: 20,
  color: colors.text,
  borderRadius: spacing.xl,
});

const $submitButtonText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  color: colors.text,
});

// small avatar for selected users list:

const $selectedUsersContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  paddingHorizontal: spacing.md,
  // height: 120,
  // flex: 1,
  flexShrink: 1,
  maxHeight: 120,
  // maxWidth: 240,
  backgroundColor: colors.palette.neutral300,
});

const $selectedUsersListContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  padding: spacing.xs,
});

const $selectedUsersGrid: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: spacing.xs,
});

const $smallAvatar: ThemedStyle<ImageStyle> = ({ colors, spacing }) => ({
  width: 24,
  height: 24,
  marginTop: 'auto',
  marginBottom: 'auto',
  marginRight: spacing.xs,
  borderRadius: spacing.md,
});

const $smallUserListItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral400,
  borderRadius: 20,
  paddingHorizontal: spacing.xs,
  // height: 16,
});

const $smallUserClearButton: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  backgroundColor: colors.palette.neutral500,
  borderRadius: 20,
  paddingHorizontal: spacing.xs,
  // height: 16,
});

const $smallUserInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  // flex: 1,
  // marginLeft: spacing.sm,
});
