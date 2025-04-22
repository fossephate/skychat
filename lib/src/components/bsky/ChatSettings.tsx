import React, { useState, useEffect } from "react";
import { View, ViewStyle, TextStyle, Switch, ActivityIndicator } from "react-native";
import { Text, ListItem } from "../../components";
import { Agent } from '@atproto/api';
import { useAppTheme } from "@/utils/useAppTheme";
import type { ThemedStyle } from "@/theme";
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Types for the AT Protocol preferences
interface ChatPreferences {
  allowMessagesFrom: 'all' | 'following' | 'none';
}

interface ChatSettingsProps {
  agent: Agent;
}

export const ChatSettings: React.FC<ChatSettingsProps> = ({ agent }) => {
  const { themed } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<ChatPreferences>({
    allowMessagesFrom: 'following',
    // notificationSoundsEnabled: true,
  });

  // Fetch current preferences on component mount
  useEffect(() => {
    fetchPreferences();
  }, [agent]);

  const userDid = agent.assertDid;

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      // Create a proxy to the chat API
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat");

      // Fetch the user's chat preferences
      // First, get user declaration for message permissions
      const profile = await agent.getProfile({ actor: userDid })
      const declaration = profile?.data.associated?.chat?.allowIncoming ?? 'following';

      setPreferences({
        allowMessagesFrom: declaration as 'all' | 'following' | 'none',
      });
    } catch (error) {
      console.error("Error fetching chat preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      // Create a proxy to the chat API
      const proxy = agent.withProxy("bsky_chat", "did:web:api.bsky.chat");

      // Save the user's chat preferences
      // await proxy.chat.bsky.actor.declaration.create({
      //   allowIncoming: preferences.allowMessagesFrom,
      // });

      // Define the new declaration record
      const declarationRecord = {
        $type: 'chat.bsky.actor.declaration',
        allowIncoming: preferences.allowMessagesFrom, // Options: 'none' | 'following' | 'followers' | 'anyone'
      };

      // Put the record into your repository
      await agent.api.com.atproto.repo.putRecord({
        repo: userDid, // Your DID
        collection: 'chat.bsky.actor.declaration',
        rkey: 'self', // Use 'self' as the record key for actor declarations
        record: declarationRecord,
      });
    } catch (error) {
      console.error("Error saving chat preferences:", error);
      // Optionally show an error message to the user
    } finally {
      setSaving(false);
    }
  };

  // Handle message permission change
  const handleMessagePermissionChange = (value: 'all' | 'following' | 'none') => {
    setPreferences(prev => ({
      ...prev,
      allowMessagesFrom: value
    }));

    // Save changes after state update
    setTimeout(() => {
      savePreferences();
    }, 0);
  };

  // Handle notification sound toggle
  const handleNotificationSoundToggle = (value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notificationSoundsEnabled: value
    }));

    // Save changes after state update
    setTimeout(() => {
      savePreferences();
    }, 0);
  };

  // Render a switch component
  const renderSwitch = (value: boolean, onValueChange: (value: boolean) => void) => (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={themed($switchTrackColor)}
      thumbColor={themed($switchThumbColor(value))}
    />
  );

  // Render icon helper
  const renderIcon = (name: string) => ({ colors }: { colors: { text: string } }) => {
    return (
      <View style={themed($iconContainer)}>
        <FontAwesome name={name as any} size={24} color={colors.text} />
      </View>
    );
  };

  // Radio option renderer
  const RadioOption = ({
    label,
    value,
    currentValue,
    onSelect
  }: {
    label: string,
    value: 'all' | 'following' | 'none',
    currentValue: string,
    onSelect: (value: 'all' | 'following' | 'none') => void
  }) => (
    <ListItem
      text={label}
      RightComponent={
        <View style={themed($radioButton)}>
          {value === currentValue && <View style={themed($radioSelected)} />}
        </View>
      }
      style={themed($listItem)}
      onPress={() => onSelect(value)}
    />
  );

  if (loading) {
    return (
      <View style={themed($loadingContainer)}>
        <ActivityIndicator size="large" />
        <Text style={themed($loadingText)}>Loading preferences...</Text>
      </View>
    );
  }

  return (
      <View style={themed($container)}>
        {/* Message Permissions Section */}
        <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>Allow new messages from</Text>
          <View style={themed($sectionContent)}>
            <RadioOption
              label="Everyone"
              value="all"
              currentValue={preferences.allowMessagesFrom}
              onSelect={handleMessagePermissionChange}
            />
            <RadioOption
              label="Users I follow"
              value="following"
              currentValue={preferences.allowMessagesFrom}
              onSelect={handleMessagePermissionChange}
            />
            <RadioOption
              label="No one"
              value="none"
              currentValue={preferences.allowMessagesFrom}
              onSelect={handleMessagePermissionChange}
            />
          </View>
        </View>

        {/* Notification Sounds Section */}
        {/* <View style={themed($section)}>
          <Text style={themed($sectionTitle)}>Notifications</Text>
          <View style={themed($sectionContent)}>
            <ListItem
              text="Notification sounds"
              LeftComponent={themed(renderIcon("bell"))}
              RightComponent={renderSwitch(
                preferences.notificationSoundsEnabled,
                handleNotificationSoundToggle
              )}
              style={themed($listItem)}
            />
          </View>
        </View> */}

        {/* Show saving indicator if currently saving */}
        {saving && (
          <View style={themed($savingContainer)}>
            <ActivityIndicator size="small" />
            <Text style={themed($savingText)}>Saving preferences...</Text>
          </View>
        )}
      </View>
  );
};

// Styles
const $screenContainer: ThemedStyle<ViewStyle> = ({ colors }) => ({
  flex: 1,
  backgroundColor: colors.background,
});

const $container: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  paddingTop: 16,
});

const $section: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginBottom: spacing.lg,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: '600',
  color: colors.text,
  marginLeft: spacing.lg,
  marginBottom: spacing.sm,
});

const $sectionContent: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  marginHorizontal: spacing.lg,
  overflow: 'hidden',
});

const $listItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  alignItems: 'center',
  minHeight: 50,
});

const $switchTrackColor: ThemedStyle<any> = ({ colors }) => ({
  false: colors.palette.neutral400,
  true: colors.palette.primary300,
});

const $switchThumbColor = (value: boolean): ThemedStyle<string> => ({ colors }) =>
  value ? colors.palette.primary500 : colors.palette.neutral200;

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 44,
  marginRight: spacing.md,
});

const $radioButton: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.palette.primary500,
  justifyContent: 'center',
  alignItems: 'center',
});

const $radioSelected: ThemedStyle<ViewStyle> = ({ colors }) => ({
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.palette.primary500,
});

const $loadingContainer: ThemedStyle<ViewStyle> = () => ({
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
});

const $loadingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginTop: spacing.sm,
  color: colors.textDim,
});

const $savingContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spacing.sm,
});

const $savingText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  marginLeft: spacing.xs,
  color: colors.textDim,
});