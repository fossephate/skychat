import React, { useState } from "react"
import { View, ViewStyle } from "react-native"
import { Screen, Text, ListItem } from "@/components"
import { useAppTheme } from "@/utils/useAppTheme"
import { translate } from "@/i18n"
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { spacing } from "@/theme"

interface Invite {
  id: string
  sender: string
  groupName: string
  timestamp: string
}

// Mock data
const mockInvites: Invite[] = [
  {
    id: "1",
    sender: "Alice",
    groupName: "Project X",
    timestamp: new Date().toISOString(),
  },
  {
    id: "2",
    sender: "Bob",
    groupName: "Gaming Squad",
    timestamp: new Date().toISOString(),
  },
]

export default function InvitesScreen() {
  const { themed } = useAppTheme()
  const [invites, setInvites] = useState<Invite[]>(mockInvites)

  const handleAccept = (inviteId: string) => {
    setInvites(current => current.filter(invite => invite.id !== inviteId))
    // TODO: Actually accept the invite
  }

  const handleDecline = (inviteId: string) => {
    setInvites(current => current.filter(invite => invite.id !== inviteId))
    // TODO: Actually decline the invite
  }

  const renderInvite = (invite: Invite) => {
    return (
      <ListItem
        key={invite.id}
        text={translate("invitesScreen:inviteMessage", {
          sender: invite.sender,
          group: invite.groupName,
        })}
        topSeparator
        RightComponent={
          <View style={themed($actionContainer)}>
            <FontAwesome.Button
              name="check"
              backgroundColor="transparent"
              color={themed($acceptIcon).color}
              onPress={() => handleAccept(invite.id)}
              style={themed($actionButton)}
            />
            <FontAwesome.Button
              name="times"
              backgroundColor="transparent"
              color={themed($declineIcon).color}
              onPress={() => handleDecline(invite.id)}
              style={themed($actionButton)}
            />
          </View>
        }
      />
    )
  }

  return (
    <Screen
      preset="fixed"
      safeAreaEdges={["top"]}
      contentContainerStyle={themed($screenContainer)}
    >
      <View style={themed($header)}>
        <Text tx="invitesScreen:title" preset="heading" style={themed($headerText)} />
      </View>

      <View style={themed($content)}>
        {invites.length === 0 ? (
          <Text
            tx="invitesScreen:empty"
            style={themed($emptyText)}
          />
        ) : (
          invites.map(renderInvite)
        )}
      </View>
    </Screen>
  )
}

const $screenContainer: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  paddingHorizontal: spacing.lg,
  paddingVertical: spacing.md,
}

const $headerText = {
  fontSize: 24,
}

const $content: ViewStyle = {
  flex: 1,
}

const $actionContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const $actionButton = {
  padding: 0,
  marginHorizontal: spacing.xs,
}

const $acceptIcon = ({ colors }) => ({
  color: colors.palette.success400,
})

const $declineIcon = ({ colors }) => ({
  color: colors.palette.angry500,
})

const $emptyText = ({ colors }) => ({
  textAlign: "center",
  marginTop: spacing.xl,
  color: colors.textDim,
})
