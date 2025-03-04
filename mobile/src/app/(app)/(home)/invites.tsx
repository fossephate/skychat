import React, { useEffect, useState, useCallback } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image
} from "react-native"
import { Screen, Text, ListItem } from "@/components"
import { useAppTheme } from "@/utils/useAppTheme"
import { translate } from "@/i18n"
import { FontAwesome } from '@expo/vector-icons'  // Fixed import
import { colors, ThemedStyle } from "@/theme"
import { useConvo } from "@/contexts/ConvoContext"
import { useAuth } from "@/contexts/AuthContext"
import { Agent } from "@atproto/api"

interface Invite {
  senderId: string
  senderName: string
  senderAvatar?: string
  groupName: string
  timestamp: string
}

// Mock data - will be replaced with actual data from API
const mockInvites: Invite[] = [
  {
    senderId: "did:plc:cn4gldkpxj43zpuqztnwyf6h",
    senderName: "Alice",
    senderAvatar: "https://i.pravatar.cc/150?u=1",
    groupName: "Alphabet Group",
    timestamp: new Date().toISOString(),
  },
  {
    senderId: "did:plc:4x3vv23ssv6fkqw6zgvqb3tl",
    senderName: "Bob",
    senderAvatar: "https://i.pravatar.cc/150?u=2",
    groupName: "Design Team",
    timestamp: new Date().toISOString(),
  },
]

export default function InvitesScreen() {
  const { themed } = useAppTheme()
  const [invites, setInvites] = useState<Invite[]>([])
  const [refreshing, setRefreshing] = useState(true)
  const convoContext = useConvo()
  const authContext = useAuth()

  const fetchInvites = async () => {
    // Get invites from context
    const userInvites = /*await convoContext.getInvites() || */mockInvites

    if (!authContext.session) {
      setInvites(userInvites)
      setRefreshing(false)
      return
    }

    const inviteDids = userInvites.map(invite => invite.senderId);

    try {
      const agent = new Agent(authContext.session);
      const profiles = await agent.getProfiles({
        actors: inviteDids
      })

      const profileData = profiles.data.profiles;

      // get the avatar url from the profile data and add it to the invite object 
      const invitesWithProfiles = userInvites.map(invite => {
        const profile = profileData.find(p => p.did === invite.senderId);
        return {
          ...invite,
          senderAvatar: profile?.avatar
        }
      })
      setInvites(invitesWithProfiles)

    } catch (error) {
      console.error('Error fetching invites:', error)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchInvites()
      // Small delay to make refresh feel more natural
      setTimeout(() => setRefreshing(false), 1000)
    } catch (error) {
      console.error('Error refreshing invites:', error)
      setRefreshing(false)
    }
  }, [convoContext, authContext])

  useEffect(() => {
    fetchInvites()
  }, [convoContext, authContext])

  const handleAccept = (inviteId: string) => {
    // TODO: Implement accept functionality with convoContext
    // convoContext.acceptInvite(inviteId)

    // For now, just remove from UI
    setInvites(current => current.filter(invite => invite.senderId !== inviteId))
  }

  const handleDecline = (inviteId: string) => {
    // TODO: Implement decline functionality with convoContext
    // convoContext.declineInvite(inviteId)

    // For now, just remove from UI
    setInvites(current => current.filter(invite => invite.senderId !== inviteId))
  }

  const renderInvite = (invite: Invite) => {
    return (
      <ListItem
        key={invite.senderId}
        topSeparator
        height={72}
        bottomSeparator
        LeftComponent={
          <View style={themed($avatarContainer)}>
            <Image
              source={{ uri: invite.senderAvatar || 'https://i.pravatar.cc/150' }}
              style={themed($avatar)}
            />
          </View>
        }
        RightComponent={
          <View style={themed($actionContainer)}>
            <FontAwesome.Button
              name="check"
              backgroundColor="transparent"
              color={themed($acceptIcon).color}
              onPress={() => handleAccept(invite.senderId)}
              style={themed($actionButton)}
              iconStyle={themed($icon)}
            />
            <FontAwesome.Button
              name="times"
              backgroundColor="transparent"
              color={themed($declineIcon).color}
              onPress={() => handleDecline(invite.senderId)}
              style={themed($actionButton)}
              iconStyle={themed($icon)}
            />
          </View>
        }
      >
        <View style={themed($inviteContent)}>
          <Text style={themed($inviteSender)} numberOfLines={1}>
            {invite.groupName}
          </Text>
          <Text style={themed($inviteGroupName)} numberOfLines={1}>
            {translate("invitesScreen:inviteMessage", { sender: invite.senderName, group: invite.groupName })}
          </Text>
        </View>
      </ListItem>
    )
  }

  // Create a refreshable empty list component
  const EmptyListComponent = () => (
    <ScrollView
      contentContainerStyle={themed($emptyContainer)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text tx="invitesScreen:empty" style={themed($emptyText)} />
    </ScrollView>
  )

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      contentContainerStyle={themed($screenContainer)}
    >
      <View style={themed($header)}>
        <Text tx="invitesScreen:title" preset="heading" style={themed($headerText)} />
      </View>

      {
        invites.length > 0 ? (
          <ScrollView
            contentContainerStyle={themed($content)}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {invites.map(renderInvite)}
          </ScrollView>
        ) : (
          <EmptyListComponent />
        )
      }
    </Screen >
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

const $content: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingHorizontal: spacing.lg,
  paddingBottom: spacing.lg,
  flexGrow: 1, // Ensure it fills the space for proper pull to refresh
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

const $inviteContent: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  justifyContent: "center",
})

const $inviteSender: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 15,
  fontWeight: "600",
  color: colors.text,
})

const $inviteGroupName: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.textDim,
  marginTop: 2,
})

const $inviteTimestamp: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 12,
  color: colors.textDim,
  marginTop: 2,
})

const $actionContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
})

const $actionButton: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  padding: 10,
  marginHorizontal: spacing.xs,
})

const $icon: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginRight: 0,
})

const $acceptIcon: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.primary500,
})

const $declineIcon: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.palette.angry500,
})

const $emptyContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
})

const $emptyText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  textAlign: "center",
  marginTop: spacing.xl,
  color: colors.textDim,
})