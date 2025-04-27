// components/ChatRequestsList.tsx
import { Text } from "../../components";
import { Chat, ChatRequestItem, User } from "../../components/chat/ChatItem";
import { useAppTheme } from "../../utils/useAppTheme";
import { ThemedStyle } from "../../theme";
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  RefreshControl,
  SectionList,
} from "react-native";
import { Agent } from "@atproto/api";
import { ActivityIndicator } from "react-native";
import { LoadingView } from "../utils/utils";
import { useStrings } from "../../contexts/strings";

export interface ChatListProps {
  agent: Agent;
  onChatPress?: (chat: Chat) => void;
  onProfilePress?: (id: string) => void;
  onGroupPress?: (id: string) => void;
  onInvitesPress?: () => void;
  showInvitesBanner?: boolean;
  showSectionHeaders?: boolean;
  refreshInterval?: number; // Auto-refresh interval in ms
}

interface ChatRequestsListProps extends ChatListProps {
  agent: Agent;
  onChatPress?: (chat: Chat) => void;
  onProfilePress?: (id: string) => void;
  onGroupPress?: (id: string) => void;
  acceptButtonText?: string;
  rejectButtonText?: string;
  refreshInterval?: number; // Auto-refresh interval in ms
}

// interface ChatItemProps {
//   item: Chat;
//   onPress: (chat: Chat) => void;
//   colors: ChatListProps['colors'];
//   styling?: ChatListProps['styling'];
// }

interface ChatRequest {
  id: string
  isBsky: boolean
  members: User[]
  name?: string
  handle?: string
  lastMessage?: {
    text: string
    sender: User
    timestamp: string
    read: boolean
  }
  unreadCount: number
  pinned?: boolean
  muted?: boolean
  verified: boolean
  verifier: boolean
}

export const ChatRequestsList: React.FC<ChatRequestsListProps> = ({
  agent,
  onChatPress,
  onProfilePress,
  refreshInterval = 1000 * 5,
  acceptButtonText,
  rejectButtonText,
}) => {
  const s = useStrings();
  const [skyChats, setSkyChats] = useState<Chat[]>([]);
  const [bskyChatRequests, setBskyChatRequests] = useState<ChatRequest[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [memberProfiles, setMemberProfiles] = useState<Map<string, User>>(new Map());

  const { themed } = useAppTheme()

  const userDid = agent.assertDid;

  // Fetch BlueChat DMs
  const fetchBskyChats = async () => {
    try {
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat");
      // @ts-ignore
      const convoRequests = (await proxy.chat.bsky.convo.listConvos({ status: "request" })).data.convos;

      if (!convoRequests.length) {
        setBskyChatRequests([]);
        return;
      }

      const transformedChats = await Promise.all(convoRequests.map(async (convo) => {
        // Extract members
        const memberUsers = convo.members.map((member) => ({
          id: member.did,
          displayName: member.displayName || member.handle,
          avatar: member.avatar,
          handle: member.handle,
        }));

        // Update member profiles
        memberUsers.forEach(member => {
          if (!memberProfiles.has(member.id)) {
            setMemberProfiles(prev => new Map(prev).set(member.id, member));
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
      }));

      // @ts-ignore
      setBskyChatRequests(transformedChats as ChatRequest[]);

    } catch (error) {
      console.error("Error fetching Bsky conversations:", error);
    }

  };

  // Refresh function
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchBskyChats();
      setRefreshing(false);
    } catch (error) {
      console.error("Error refreshing:", error);
      setRefreshing(false);
    }
  }, [agent, userDid]);

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
    return () => { };
  }, [refreshInterval, agent, userDid]);

  // Create sections for the SectionList
  const sections = [];

  if (skyChats.length > 0) {
    sections.push({ title: 'Skychat Requests', data: skyChats, type: 'sky' });
  }

  if (bskyChatRequests.length > 0) {
    sections.push({ title: 'Bsky Chat Requests', data: bskyChatRequests, type: 'bsky' });
  }

  // Render section header
  const renderSectionHeader = ({ section }: { section: any }) => (
    <View style={themed($sectionHeader)}>
      <Text preset="bold" style={themed($sectionHeaderText)}>{section.title}</Text>
    </View>
  )

  // Create a refreshable empty list component
  const EmptyListComponent = () => (
    <ScrollView
      contentContainerStyle={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text text={s('chatRequestsEmpty')} preset="bold" />
    </ScrollView>
  )

  if (isLoading) {
    return <LoadingView />;
  }

  const onAccept = async (chat: Chat) => {
    console.log("Accepting chat:", chat);
    if (chat.isBsky) {
      const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
      await proxy.chat.bsky.convo.acceptConvo({ convoId: chat.id });
      onRefresh();
      return;
    }

  }

  const onReject = async (chat: Chat) => {
    console.log("Rejecting chat:", chat);
    if (chat.isBsky) {
      const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
      await proxy.chat.bsky.convo.leaveConvo({ convoId: chat.id });
      onRefresh();
      return;
    }
  }

  const renderChatRequestItem = ({ item }: { item: Chat }) => {
    return (<ChatRequestItem
      item={item}
      onChatPress={onChatPress}
      onProfilePress={onProfilePress}
      onAccept={onAccept}
      onReject={onReject}
      acceptButtonText={acceptButtonText}
      rejectButtonText={rejectButtonText}
    />)
  }

  return (
    <View style={{ flex: 1 }}>
      {sections.length > 0 ? (
        <SectionList
          sections={sections}
          renderItem={renderChatRequestItem}
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
    </View>
  );
};


// Styles
const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $invitesBanner: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.sm,
  paddingVertical: 1,
  marginBottom: spacing.md,
  border: 0,
  borderRadius: 0,
  backgroundColor: colors.palette.secondary500,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: 40,
})

const $invitesBannerIcon: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginRight: spacing.sm,
  color: colors.text,
  padding: 0,
})

const $notificationDot: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: -2,
  right: 2,
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: colors.error,
})

const $invitesEnvelope: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  position: "relative",
  marginRight: spacing.md,
})

const $header: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
})

const $sectionHeader: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.background,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
})

const $sectionHeaderText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 18,
  color: colors.text,
})

const $headerText: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 32,
  color: colors.text,
})

const $searchContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
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

const $listContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.lg,
  flexGrow: 1, // Ensure it fills the space for proper pull to refresh
})