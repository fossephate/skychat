// components/ChatList.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  ViewStyle,
  TextStyle,
  ScrollView,
  RefreshControl,
  SectionList,
  TouchableOpacity,
} from "react-native";
import { Agent } from "@atproto/api";
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Text } from "@/components";
import { ActivityIndicator } from "react-native";
import { Chat, ChatItem, User } from "@/components/chat/ChatItem";

// // Define types for props and data models
// export interface User {
//   id: string;
//   displayName: string;
//   avatar?: string;
//   handle?: string;
//   verified?: boolean;
// }

// export interface Chat {
//   id: string;
//   name?: string;
//   handle?: string;
//   members: User[];
//   lastMessage?: {
//     text: string;
//     createdAt: string;
//     sender: User;
//   };
//   unreadCount: number;
//   isBsky: boolean;
// }

export interface ChatListProps {
  agent: Agent;
  userDid: string;
  customSkychats?: Chat[];
  onChatPress?: (chat: Chat) => void;
  onInvitesPress?: () => void;
  colors: {
    background: string;
    text: string;
    secondaryText?: string;
    accent?: string;
    separator?: string;
    primary?: string;
    secondary?: string;
  };
  styling?: {
    headerText?: TextStyle;
    invitesBanner?: ViewStyle;
    sectionHeader?: ViewStyle;
    sectionHeaderText?: TextStyle;
    chatItem?: ViewStyle;
    spacing?: {
      sm?: number;
      md?: number;
      lg?: number;
      xs?: number;
    };
  };
  showInvitesBanner?: boolean;
  showSectionHeaders?: boolean;
  refreshInterval?: number; // Auto-refresh interval in ms
  emptyStateComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

// interface ChatItemProps {
//   item: Chat;
//   onPress: (chat: Chat) => void;
//   colors: ChatListProps['colors'];
//   styling?: ChatListProps['styling'];
// }

const DEFAULT_COLORS = {
  background: "#FFFFFF",
  text: "#000000",
  secondaryText: "#757575",
  accent: "#007AFF",
  separator: "#EEEEEE",
  primary: "#007AFF",
  secondary: "#F2F2F7",
};

const DEFAULT_SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

export const ChatList: React.FC<ChatListProps> = ({
  agent,
  userDid,
  customSkychats = [],
  onChatPress,
  onInvitesPress,
  colors: providedColors,
  styling,
  showInvitesBanner = true,
  showSectionHeaders = true,
  refreshInterval,
  emptyStateComponent,
  loadingComponent,
}) => {

  return <></>
  // const [bskyChats, setBskyChats] = useState<Chat[]>([]);
  // const [skyChats, setSkyChats] = useState<Chat[]>(customSkychats);
  // const [refreshing, setRefreshing] = useState(false);
  // const [isLoading, setIsLoading] = useState(true);
  // const [memberProfiles, setMemberProfiles] = useState<Map<string, User>>(new Map());

  // const colors = { ...DEFAULT_COLORS, ...providedColors };
  // const spacing = styling?.spacing || DEFAULT_SPACING;

  // // Handle chat selection
  // const handleChatPress = (chat: Chat) => {
  //   if (onChatPress) {
  //     onChatPress(chat);
  //   }
  // };

  // // Handle invites button press
  // const handleInvitesPress = () => {
  //   if (onInvitesPress) {
  //     onInvitesPress();
  //   }
  // };

  // // Fetch user profile function
  // const fetchUserProfile = async (did: string): Promise<User> => {
  //   if (memberProfiles.has(did)) {
  //     return memberProfiles.get(did) as User;
  //   }

  //   try {
  //     const profile = await agent.getProfile({ actor: did });
  //     const userProfile = {
  //       id: did,
  //       displayName: profile.data.displayName || did.substring(0, 8) + '...',
  //       avatar: profile.data.avatar,
  //       handle: profile.data.handle,
  //     };

  //     // Update memberProfiles map
  //     setMemberProfiles(prev => new Map(prev).set(did, userProfile));

  //     return userProfile;
  //   } catch (error) {
  //     console.error(`Error fetching profile for ${did}:`, error);
  //     const userProfile = {
  //       id: did,
  //       displayName: did.substring(0, 8) + '...',
  //       avatar: `https://i.pravatar.cc/150?u=${did}`,
  //     };

  //     // Update memberProfiles map with fallback
  //     setMemberProfiles(prev => new Map(prev).set(did, userProfile));

  //     return userProfile;
  //   }
  // };

  // // Fetch BlueChat DMs
  // const fetchBskyChats = async () => {
  //   try {
  //     const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat");
  //     const response = await proxy.chat.bsky.convo.listConvos();
  //     const convos = response.data.convos;

  //     if (!convos.length) {
  //       setBskyChats([]);
  //       return;
  //     }

  //     const transformedChats = await Promise.all(convos.map(async (convo) => {
  //       // Extract members
  //       const memberUsers = convo.members.map((member) => ({
  //         id: member.did,
  //         displayName: member.displayName || member.handle,
  //         avatar: member.avatar,
  //         verified: !!member.verified,
  //         handle: member.handle,
  //       }));

  //       // Update member profiles
  //       memberUsers.forEach(member => {
  //         if (!memberProfiles.has(member.id)) {
  //           setMemberProfiles(prev => new Map(prev).set(member.id, member));
  //         }
  //       });

  //       // Find other user (not current user)
  //       let handle;
  //       let name;
  //       for (const member of memberUsers) {
  //         if (member.id !== userDid) {
  //           handle = member.handle;
  //           name = member.displayName;
  //           break;
  //         }
  //       }

  //       return {
  //         id: convo.id,
  //         name: name,
  //         handle: handle,
  //         members: memberUsers,
  //         lastMessage: convo.lastMessage,
  //         unreadCount: convo.unreadCount || 0,
  //         isBsky: true,
  //       };
  //     }));

  //     setBskyChats(transformedChats as Chat[]);
  //   } catch (error) {
  //     console.error("Error fetching Bsky conversations:", error);
  //   }
  // };

  // // Set custom SkyChats if provided
  // useEffect(() => {
  //   if (customSkychats.length > 0) {
  //     setSkyChats(customSkychats);
  //   }
  // }, [customSkychats]);

  // // Refresh function
  // const onRefresh = useCallback(async () => {
  //   setRefreshing(true);
  //   try {
  //     await fetchBskyChats();
  //     setRefreshing(false);
  //   } catch (error) {
  //     console.error("Error refreshing:", error);
  //     setRefreshing(false);
  //   }
  // }, [agent, userDid]);

  // // Initial loading
  // useEffect(() => {
  //   setIsLoading(true);
  //   fetchBskyChats().then(() => setIsLoading(false));
  // }, [agent, userDid]);

  // // Setup auto-refresh if interval provided
  // useEffect(() => {
  //   if (refreshInterval) {
  //     const intervalId = setInterval(() => {
  //       fetchBskyChats();
  //     }, refreshInterval);

  //     return () => clearInterval(intervalId);
  //   }
  //   return () => {};
  // }, [refreshInterval, agent, userDid]);

  // // Create sections for the SectionList
  // const sections = [];

  // if (skyChats.length > 0) {
  //   sections.push({ title: 'Skychats', data: skyChats, type: 'sky' });
  // }

  // if (bskyChats.length > 0) {
  //   sections.push({ title: 'Bsky DMs', data: bskyChats, type: 'bsky' });
  // }

  // // Render section header
  // const renderSectionHeader = ({ section }: { section: any }) => {
  //   if (!showSectionHeaders) return null;

  //   return (
  //     <View style={{
  //       backgroundColor: colors.background,
  //       paddingHorizontal: spacing.md,
  //       paddingVertical: spacing.sm,
  //       borderBottomWidth: 1,
  //       borderBottomColor: colors.separator || DEFAULT_COLORS.separator,
  //       ...(styling?.sectionHeader || {}),
  //     }}>
  //       <Text
  //         style={{
  //           fontSize: 18,
  //           fontWeight: "bold",
  //           color: colors.text,
  //           ...(styling?.sectionHeaderText || {}),
  //         }}
  //       >
  //         {section.title}
  //       </Text>
  //     </View>
  //   );
  // };

  // // Empty list component
  // const EmptyListComponent = () => {
  //   if (emptyStateComponent) return <>{emptyStateComponent}</>;

  //   return (
  //     <ScrollView
  //       contentContainerStyle={{
  //         flex: 1,
  //         justifyContent: "center",
  //         alignItems: "center"
  //       }}
  //       refreshControl={
  //         <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  //       }
  //     >
  //       <Text
  //         style={{
  //           fontSize: 16,
  //           fontWeight: "bold",
  //           color: colors.text,
  //         }}
  //       >
  //         No chats available
  //       </Text>
  //     </ScrollView>
  //   );
  // };

  // // Loading component
  // const LoadingView = () => {
  //   if (loadingComponent) return <>{loadingComponent}</>;

  //   return (
  //     <View style={{
  //       flex: 1,
  //       justifyContent: "center",
  //       alignItems: "center"
  //     }}>
  //       <ActivityIndicator size="large" color={colors.primary} />
  //     </View>
  //   );
  // };

  // if (isLoading) {
  //   return <LoadingView />;
  // }

  // return (
  //   <View style={{
  //     flex: 1,
  //     backgroundColor: colors.background,
  //   }}>
  //     {showInvitesBanner && (
  //       <TouchableOpacity
  //         style={{
  //           flexDirection: "row",
  //           backgroundColor: colors.secondary || DEFAULT_COLORS.secondary,
  //           padding: spacing.sm,
  //           marginBottom: spacing.md,
  //           alignItems: "center",
  //           justifyContent: "space-between",
  //           ...(styling?.invitesBanner || {}),
  //         }}
  //         onPress={handleInvitesPress}
  //       >
  //         <View style={{ flexDirection: "row", alignItems: "center" }}>
  //           <FontAwesome
  //             name="envelope"
  //             size={24}
  //             style={{
  //               marginRight: spacing.sm,
  //               color: colors.text,
  //             }}
  //           />
  //           <Text
  //             style={{
  //               fontWeight: "bold",
  //               color: colors.text,
  //             }}
  //           >
  //             Chat Requests
  //           </Text>
  //         </View>
  //         <FontAwesome
  //           name="chevron-right"
  //           size={24}
  //           style={{ color: colors.text }}
  //         />
  //       </TouchableOpacity>
  //     )}

  //     {sections.length > 0 ? (
  //       <SectionList
  //         sections={sections}
  //         renderItem={({ item }) => (
  //           <ChatItem
  //             item={item}
  //             //onPress={handleChatPress}
  //             // colors={colors}
  //             // styling={styling}
  //           />
  //         )}
  //         renderSectionHeader={renderSectionHeader}
  //         keyExtractor={(item) => item.id}
  //         contentContainerStyle={{
  //           paddingHorizontal: spacing.md,
  //           paddingBottom: spacing.lg,
  //           flexGrow: 1,
  //         }}
  //         showsVerticalScrollIndicator={false}
  //         refreshControl={
  //           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  //         }
  //         stickySectionHeadersEnabled={showSectionHeaders}
  //       />
  //     ) : (
  //       <EmptyListComponent />
  //     )}
  //   </View>
  // );
};