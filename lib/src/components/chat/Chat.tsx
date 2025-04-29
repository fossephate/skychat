// @ts-nocheck
import { ThemedStyle } from '../../theme';
import ChatMessageBox from './ChatMessageBox';
import ReplyMessageBar from './ReplyMessageBar';
import { useAppTheme } from '../../utils/useAppTheme';
import { translate } from '../../i18n';
import { Header, Text } from '../../components';
import { ChatListProps } from './ChatList';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ImageBackground,
  View,
  ViewStyle,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import {
  IMessage,
  GiftedChat,
  SystemMessage,
  Bubble,
  Send,
  InputToolbar,
} from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmojiPopup } from 'react-native-emoji-popup';
import { router, useLocalSearchParams } from 'expo-router';
import { Agent } from '@atproto/api';
import { PostRenderer } from '../bsky/PostRenderer';
import { Button } from '../Button';
import { FontAwesome } from '@expo/vector-icons';
import { ChatWrapper } from './ChatWrapper';

export interface ChatProps {
  agent: Agent;
  groupId: string;
  refreshInterval?: number; // Auto-refresh interval in ms
  onPressAvatar?: (id: string) => void;
  onPressLink?: (link: string) => void;
}

export const Chat: React.FC<ChatProps> = ({
  agent,
  groupId,
  onPressAvatar,
  onPressLink,
}) => {
  // figure out if the id is a bsky chat or a skychat group:
  if (groupId.length < 16) {
    return (
      <BskyChat
        agent={agent}
        groupId={groupId}
        onPressAvatar={onPressAvatar}
        onPressLink={onPressLink}
      />
    );
  } else {
    return (
      <SkyChat
        agent={agent}
        groupId={groupId}
        onPressAvatar={onPressAvatar}
        onPressLink={onPressLink}
      />
    );
  }
};
