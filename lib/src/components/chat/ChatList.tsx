import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  RefreshControl,
  SectionList,
  TouchableOpacity,
} from 'react-native';
import { Agent } from '@atproto/api';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Button, Text, TextField } from '../../components';
import { ActivityIndicator } from 'react-native';
import { Chat, ChatItem, User } from '../../components/chat/ChatItem';
import { useAppTheme } from '../../utils/useAppTheme';
import { ThemedStyle } from '../../theme';
import { LoadingView } from '../util/utils';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';

export interface ChatListProps {
  agent: Agent;
  onChatPress?: (chat: Chat) => void;
  onProfilePress?: (chat: Chat) => void;
  onInvitesPress?: () => void;
  showInvitesBanner?: boolean;
  refreshInterval?: number; // Auto-refresh interval in ms
}

export const ChatList: React.FC<ChatListProps> = ({
  agent,
  onChatPress,
  onProfilePress,
  onInvitesPress,
  showInvitesBanner = true,
  refreshInterval,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bskyChats, setBskyChats] = useState<Chat[]>([]);
  const [skyChats, setSkyChats] = useState<Chat[]>([]);
  const [bskyChatRequests, setBskyChatRequests] = useState<Chat[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [memberProfiles, setMemberProfiles] = useState<Map<string, User>>(
    new Map()
  );
  const actionSheetRef = useRef<ActionSheetRef>(null);
  const userDid = agent.assertDid;

  const [chatToLeave, setChatToLeave] = useState<Chat | null>(null);

  const { themed } = useAppTheme();

  // Fetch user profile function
  const fetchUserProfile = async (did: string): Promise<User> => {
    if (memberProfiles.has(did)) {
      return memberProfiles.get(did) as User;
    }

    try {
      const profile = await agent.getProfile({ actor: did });
      const userProfile = {
        id: did,
        displayName: profile.data.displayName || did.substring(0, 8) + '...',
        avatar: profile.data.avatar,
        handle: profile.data.handle,
      };

      // Update memberProfiles map
      setMemberProfiles((prev) => new Map(prev).set(did, userProfile));

      return userProfile;
    } catch (error) {
      console.error(`Error fetching profile for ${did}:`, error);
      const userProfile = {
        id: did,
        displayName: did.substring(0, 8) + '...',
        avatar: `https://i.pravatar.cc/150?u=${did}`,
      };

      // Update memberProfiles map with fallback
      setMemberProfiles((prev) => new Map(prev).set(did, userProfile));

      return userProfile;
    }
  };

  // Fetch BlueChat DMs
  const fetchBskyChats = async () => {
    try {
      const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
      // @ts-ignore
      const convoRequests = (
        await proxy.chat.bsky.convo.listConvos({ status: 'request' })
      ).data.convos;
      // @ts-ignore
      const convos = (
        await proxy.chat.bsky.convo.listConvos({ status: 'accepted' })
      ).data.convos;

      if (!convos.length) {
        setBskyChats([]);
        return;
      }

      const transformedChats = await Promise.all(
        convos.map(async (convo) => {
          // Extract members
          const memberUsers = convo.members.map((member) => ({
            id: member.did,
            displayName: member.displayName || member.handle,
            avatar: member.avatar,
            // verified: !!member.verified,
            handle: member.handle,
          }));

          // Update member profiles
          memberUsers.forEach((member) => {
            if (!memberProfiles.has(member.id)) {
              setMemberProfiles((prev) => new Map(prev).set(member.id, member));
            }
          });

          // Find other user (not current user)
          let handle;
          let name;
          for (const member of memberUsers) {
            if (member.id !== userDid) {
              handle = member.handle;
              name = member.displayName;
              break;
            }
          }

          return {
            id: convo.id,
            name: name,
            handle: handle,
            members: memberUsers,
            lastMessage: convo.lastMessage,
            unreadCount: convo.unreadCount || 0,
            isBsky: true,
          };
        })
      );

      setBskyChats(transformedChats as Chat[]);

      const transformedChatRequests = await Promise.all(
        convoRequests.map(async (convo) => {
          // Extract members
          const memberUsers = convo.members.map((member) => ({
            id: member.did,
            displayName: member.displayName || member.handle,
            avatar: member.avatar,
            // verified: !!member.verified,
            handle: member.handle,
          }));

          // Update member profiles
          memberUsers.forEach((member) => {
            if (!memberProfiles.has(member.id)) {
              setMemberProfiles((prev) => new Map(prev).set(member.id, member));
            }
          });

          // Find other user (not current user)
          let handle;
          let name;
          for (const member of memberUsers) {
            if (member.id !== userDid) {
              handle = member.handle;
              name = member.displayName;
              break;
            }
          }

          return {
            id: convo.id,
            name: name,
            handle: handle,
            members: memberUsers,
            lastMessage: convo.lastMessage,
            unreadCount: convo.unreadCount || 0,
            isBsky: true,
          };
        })
      );

      // setSkyChats(transformedChatRequests as Chat[]);
      setBskyChatRequests(transformedChatRequests as Chat[]);
    } catch (error) {
      console.error('Error fetching Bsky conversations:', error);
    }
  };

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBskyChats();
      setRefreshing(false);
    } catch (error) {
      console.error('Error refreshing:', error);
      setRefreshing(false);
    }
  }, [agent, userDid]);

  const onLeaveChat = useCallback(
    async (chat: Chat) => {
      setChatToLeave(chat);
      actionSheetRef.current?.show();
    },
    [agent]
  );

  const confirmLeaveChat = useCallback(async () => {
    try {
      if (!chatToLeave) {
        return;
      }
      const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
      await proxy.chat.bsky.convo.leaveConvo({ convoId: chatToLeave?.id });
    } catch (error) {
      console.error('Error leaving chat:', error);
    }
    actionSheetRef.current?.hide();
    onRefresh();
  }, [agent, chatToLeave]);

  // Initial loading
  useEffect(() => {
    setIsLoading(true);
    fetchBskyChats().then(() => setIsLoading(false));
  }, [agent, userDid]);

  // Setup auto-refresh if interval provided
  useEffect(() => {
    if (refreshInterval) {
      const intervalId = setInterval(() => {
        fetchBskyChats();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
    return () => {};
  }, [refreshInterval, agent, userDid]);

  // Create sections for the SectionList
  const sections = [];

  if (skyChats.length > 0) {
    sections.push({ title: 'Skychats', data: skyChats, type: 'sky' });
  }

  if (bskyChats.length > 0) {
    sections.push({ title: 'Bsky DMs', data: bskyChats, type: 'bsky' });
  }

  // Render section header
  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={themed($sectionHeader)}>
      <Text preset="bold" style={themed($sectionHeaderText)}>
        {section.title}
      </Text>
    </View>
  );

  // Create a refreshable empty list component
  const EmptyListComponent = () => (
    <ScrollView
      contentContainerStyle={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text tx="chatScreen:noChats" preset="bold" />
    </ScrollView>
  );

  if (isLoading) {
    return <LoadingView />;
  }

  // check if the unread count > 0 on any of the chat requests
  const hasUnreadChatRequests = bskyChatRequests.some(
    (chat) => chat.unreadCount > 0
  );

  return (
    <View style={{ flex: 1 }}>
      {showInvitesBanner && (
        <Button style={themed($invitesBanner)} onPress={onInvitesPress}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              flex: 1,
              width: '100%',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={themed($invitesEnvelope)}>
                <FontAwesome
                  name="envelope"
                  size={14}
                  style={themed($invitesBannerIcon)}
                />
                {hasUnreadChatRequests && (
                  <View style={themed($notificationDot)} />
                )}
              </View>
              <Text tx="chatsScreen:chatRequests" />
            </View>
            <View style={{ alignItems: 'center' }}>
              <FontAwesome
                name="chevron-right"
                size={14}
                style={{ ...themed($invitesBannerIcon), marginTop: 6 }}
              />
            </View>
          </View>
        </Button>
      )}

      {/* <View style={themed($searchContainer)}>
        <TextField
          style={themed($searchInput)}
          placeholderTx="chatsScreen:searchPlaceholder"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View> */}

      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          renderItem={({ item }) => (
            <ChatItem
              item={item}
              onChatPress={onChatPress}
              onProfilePress={onProfilePress}
              onLeaveChat={onLeaveChat}
            />
          )}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={themed($listContent)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          stickySectionHeadersEnabled={true}
        />
      ) : (
        <EmptyListComponent />
      )}

      {/* TODO: expose overrides for the text and button text */}
      <ActionSheet ref={actionSheetRef}>
        <View style={themed($actionSheetContainer)}>
          <Text style={{ fontSize: 24, paddingBottom: 8, fontWeight: 'bold' }}>Leave Conversation</Text>
          <Text>Are you sure you want to leave this conversation?</Text>
          <Text>Your message will be deleted for you, but not for the other participant.</Text>
          <Button onPress={confirmLeaveChat} style={themed($actionSheetButton)}>
            <Text>Leave</Text>
          </Button>
          <Button onPress={() => actionSheetRef.current?.hide()} style={{ marginTop: 6 }}>
            <Text>Cancel</Text>
          </Button>
        </View>
      </ActionSheet>
    </View>
  );
};

// action sheet styles
const $actionSheetContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingBottom: spacing.xl,
  paddingTop: spacing.md,
  paddingHorizontal: spacing.lg,
  backgroundColor: colors.background,
  color: colors.text,
});

const $actionSheetButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.md,
  backgroundColor: colors.error,
});

// Styles
const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $invitesBanner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 1,
  marginBottom: spacing.md,
  border: 0,
  borderRadius: 0,
  backgroundColor: colors.palette.secondary500,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  minHeight: 40,
});

const $invitesBannerIcon: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginRight: spacing.sm,
  color: colors.text,
  padding: 0,
});

const $notificationDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: 'absolute',
  top: -2,
  right: 2,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.error,
});

const $invitesEnvelope: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: 'relative',
  marginRight: spacing.md,
});

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const $sectionHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
});

const $sectionHeaderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  color: colors.text,
});

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 32,
  color: colors.text,
});

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.sm,
});

const $searchInput: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  height: 40,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 20,
  paddingHorizontal: spacing.md,
  fontSize: 16,
  color: colors.text,
  textAlignVertical: 'center',
});

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
  flexGrow: 1, // Ensure it fills the space for proper pull to refresh
});
