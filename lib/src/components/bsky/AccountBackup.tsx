import React, { useState, useEffect } from 'react';
import {
  View,
  ViewStyle,
  TextStyle,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Text, ListItem } from '../../components';
import { Agent } from '@atproto/api';
import { useAppTheme } from '../../utils/useAppTheme';
import type { ThemedStyle } from '@/theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

// Types for the AT Protocol preferences
interface ChatPreferences {
  allowMessagesFrom: 'all' | 'following' | 'none';
}

interface AccountBackupProps {
  agent: Agent;
}

export const AccountBackup: React.FC<AccountBackupProps> = ({ agent }) => {
  const { themed, theme } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<ChatPreferences>({
    allowMessagesFrom: 'following',
  });

  const userDid = agent.assertDid;

  /**
   * Adds a rotation key to the PLC document
   * @param {string} newKeyStr - The new key to add in did:key format
   * @param {object} options - Configuration options
   * @param {boolean} [options.insertFirst=false] - Whether to insert the key at the beginning of the list
   * @param {string} [options.plcHost="https://plc.directory"] - The PLC host
   * @param {string} [options.token] - Optional token for the operation
   * @returns {Promise<void>}
   */
  async function addRotationKey(newKeyStr: string, options: any) {
    const {
      insertFirst = false,
      plcHost = 'https://plc.directory',
      token = undefined,
    } = options;

    if (!newKeyStr || !newKeyStr.startsWith('did:key:')) {
      throw new Error('Need to provide valid public key argument (as did:key)');
    }

    // 1. Fetch current PLC data
    const plcDataUrl = `${plcHost}/${userDid}/data`;
    const response = await fetch(plcDataUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch PLC data: ${response.statusText}`);
    }

    const plcData = await response.json();

    // Check if we already have 5 rotation keys (the maximum)
    if (plcData.rotationKeys && plcData.rotationKeys.length >= 5) {
      console.warn(
        'WARNING: already have 5 rotation keys, which is the maximum'
      );
    }

    // Check if key already exists in rotation keys
    if (plcData.rotationKeys && plcData.rotationKeys.includes(newKeyStr)) {
      throw new Error('Key already registered as a rotation key');
    }

    // 2. Update data - add the new key
    if (insertFirst && plcData.rotationKeys) {
      plcData.rotationKeys.unshift(newKeyStr);
    } else {
      plcData.rotationKeys = plcData.rotationKeys || [];
      plcData.rotationKeys.push(newKeyStr);
    }

    console.log('Requesting signature');
    const tok = await agent.com.atproto.identity.requestPlcOperationSignature();
    console.log('token', tok);

    // // 3. Sign the operation
    const operationInput = {
      ...plcData,
    };

    if (token) {
      operationInput.token = token;
    }

    // // Using the atproto identity API to sign the operation
    const signedOp =
      await agent.com.atproto.identity.signPlcOperation(operationInput);

    // // 4. Submit the signed operation
    // await agent.api.com.atproto.identity.submitPlcOperation({
    //   operation: signedOp.operation,
    // });

    console.log('Success! Rotation key added.');
  }

  const renderIcon =
    (name: string) =>
    ({ colors }: { colors: { text: string } }) => {
      return (
        <View style={themed($iconContainer)}>
          <FontAwesome name={name as any} size={24} color={colors.text} />
        </View>
      );
    };

  const handleBackup = async () => {
    console.log('Backup');
    try {
      await addRotationKey('did:key:test', {});
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={themed($container)}>
      <ListItem
        text="Backup Account"
        LeftComponent={themed(renderIcon('warning'))}
        style={[themed($listItem), themed($destructiveItem)]}
        textStyle={themed($destructiveText)}
        onPress={handleBackup}
      />
    </View>
  );
};

const $container: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  flex: 1,
  paddingVertical: spacing.md,
});

const $sectionTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 18,
  fontWeight: '600',
  color: colors.text,
  marginLeft: spacing.lg,
  marginBottom: spacing.sm,
});

const $infoContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  marginHorizontal: spacing.lg,
  marginTop: spacing.sm,
  backgroundColor: colors.palette.neutral300,
  borderRadius: 16,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.palette.neutral200,
  flexDirection: 'row',
});

const $listItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.separator,
  alignItems: 'center',
  minHeight: 50,
});

const $iconContainer: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 44,
  marginRight: spacing.md,
});

const $destructiveItem: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: colors.tint,
  marginHorizontal: spacing.lg,
  borderRadius: 16,
});

const $destructiveText: ThemedStyle<TextStyle> = ({ colors }) => ({
  color: colors.text,
});
