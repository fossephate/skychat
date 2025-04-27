import { router } from "expo-router";
import React, { useEffect } from "react"
import { View, ViewStyle, TextStyle, ScrollView, Image, ImageStyle, Switch } from "react-native"
import { Screen, Text, ListItem } from "src/components"
import { Agent } from '@atproto/api'
import { useAppTheme } from "@/utils/useAppTheme"
import type { ThemedStyle } from "@/theme"
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { useAuth } from "@/contexts/AuthContext";
import { useConvo, ChatSettings, AccountBackup } from 'skychat-lib';

export default function SettingsScreen() {

  const { themed } = useAppTheme();
  const { client, session, setDidAuthenticate } = useAuth();
  const convoContext = useConvo();

  const [userProfile, setUserProfile] = React.useState({
    displayName: "",
    handle: "",
    description: "",
    avatar: "",
  })

  const [loading, setLoading] = React.useState(true);


  if (!session) {
    console.error("No session found")
    router.push("/login")
    return <></>
  }

  const agent = new Agent(session)

  useEffect(() => {
    async function fetchProfile() {
      if (!client || !session) return;

      try {
        const profile = await agent.getProfile({
          actor: session.did,
        })

        setUserProfile({
          displayName: profile.data.displayName || profile.data.handle,
          handle: profile.data.handle,
          description: profile.data.description || "",
          avatar: profile.data.avatar || "https://i.pravatar.cc/150",
        })
      } catch (error) {
        console.error("Error fetching profile:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [client, session])

  // Update the ListItem icons to use FontAwesome
  const renderIcon = (name: string) => ({ colors }: { colors: { text: string } }) => {
    return (
      <View style={themed($iconContainer)}>
        <FontAwesome name={name as any} size={24} color={colors.text} />
      </View>
    )
  }

  const handleLogout = async () => {
    try {
      if (client) {
        setDidAuthenticate(false);
      }
      convoContext?.clearManagerState();
    } catch (err) {
      console.error("Logout error:", err)
    }
    router.replace("/welcome" as any)
  }

  return (
    <Screen preset="fixed" safeAreaEdges={["top"]} contentContainerStyle={themed($screenContainer)}>
      <ScrollView style={themed($container)} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={themed($profileCard)}>
          <View style={themed($profileHeader)}>
            <View style={themed($avatarContainer)}>
              <Image source={{ uri: userProfile.avatar }} style={themed($avatar)} />
            </View>
            <View style={themed($profileInfo)}>
              <Text preset="heading" style={themed($name)}>
                {userProfile.displayName}
              </Text>
              <Text style={themed($handle)}>@{userProfile.handle}</Text>
              <Text style={themed($bio)} numberOfLines={3}>
                {userProfile.description}
              </Text>
            </View>
          </View>
        </View>


        <ChatSettings agent={agent} />

        {/* <AccountBackup agent={agent} /> */}

        {/* Account Actions */}
        <View style={themed($section)}>
          <ListItem
            tx="common:logOut"
            LeftComponent={themed(renderIcon("sign-out"))}
            style={[themed($listItem), themed($destructiveItem)]}
            textStyle={themed($destructiveText)}
            onPress={handleLogout}
          />
        </View>

        <View style={themed($footer)}>
          <Text style={themed($version)}>Version 0.1.0</Text>
        </View>
      </ScrollView>
    </Screen>
  )
}

// Update the themed styles to use theme values consistently
const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
})

const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
})

const $profileCard: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  margin: spacing.lg,
  backgroundColor: colors.palette.neutral100,
  borderRadius: 20,
  padding: spacing.lg,
  shadowColor: colors.palette.neutral800,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  elevation: 3,
})

const $profileHeader: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: "row",
  marginBottom: spacing.md,
})

const $avatarContainer: ThemedStyle<ViewStyle> = () => ({
  position: "relative",
})

const $avatar: ThemedStyle<ImageStyle> = () => ({
  width: 80,
  height: 80,
  borderRadius: 40,
})

const $verifiedBadge: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  bottom: -4,
  right: -4,
  backgroundColor: colors.palette.primary500,
  borderRadius: 12,
  width: 24,
  height: 24,
  justifyContent: "center",
  alignItems: "center",
  borderWidth: 2,
  borderColor: colors.background,
})

const $profileInfo: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  marginLeft: spacing.md,
})

const $name: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 24,
  color: colors.text,
  marginBottom: spacing.xs,
})

const $handle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  color: colors.textDim,
  marginBottom: spacing.xs,
})

const $bio: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 14,
  color: colors.text,
})

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginTop: spacing.md,
})

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  color: colors.text,
  marginLeft: spacing.lg,
  marginBottom: spacing.sm,
})

const $sectionContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  marginHorizontal: spacing.lg,
})

const $listItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  alignItems: 'center',
  minHeight: 44,
})

const $destructiveItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.error,
  marginHorizontal: spacing.lg,
  borderRadius: 16,
})

const $destructiveText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
})

const $footer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  alignItems: "center",
  padding: spacing.lg,
})

const $version: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.textDim,
  fontSize: 12,
})

const $switchTrackColor: ThemedStyle<any> = ({ colors }) => ({
  false: colors.palette.neutral400,
  true: colors.palette.primary300,
})

const $switchThumbColor = (value: boolean): ThemedStyle<string> => ({ colors }) =>
  value ? colors.palette.primary500 : colors.palette.neutral200

// Add this new style near the other style definitions
const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 44, // This matches common list item heights
  marginRight: spacing.md,
})