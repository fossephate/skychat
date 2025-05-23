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
import { router, useLocalSearchParams } from 'expo-router';
import { Agent } from '@atproto/api';
import { PostRenderer } from '../bsky/PostRenderer';
import { Button } from '../Button';
import { FontAwesome } from '@expo/vector-icons';
import { ChatWrapper } from './ChatWrapper';

export interface BskyChatProps {
  agent: Agent;
  groupId: string;
  refreshInterval?: number; // Auto-refresh interval in ms
  onPressAvatar?: (id: string) => void;
  onPressLink?: (link: string) => void;
}

export const BskyChat: React.FC<BskyChatProps> = ({
  agent,
  groupId,
  onPressAvatar,
  onPressLink,
  refreshInterval = 5000,
}) => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [convoName, setConvoName] = useState('Chat');
  const [convoMembers, setConvoMembers] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null);
  const swipeableRowRef = useRef<Swipeable | null>(null);

  const userDid = agent.assertDid;

  const { themed, theme } = useAppTheme();

  const [emoji, setEmoji] = useState('👍');

  // map did's to profile images:
  const [profileImages, setProfileImages] = useState<Record<string, string>>(
    {}
  );

  const getProfileImage = async (did: string) => {
    const profile = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: 'app.bsky.actor.profile',
      rkey: 'self',
    });
    // @ts-ignore - Handling potential type issues
    const avatarUri = profile.data.value.avatar;
    return avatarUri || undefined;
  };

  const transformMessages = async (messages: any[]) => {
    const transformedMessages: IMessage[] = await Promise.all(
      messages.map(async (msg) => {
        // The sender is the current user if their DID matches the message sender
        const isSelf = msg.sender?.did === userDid;

        // check if we have an avatar for this user, if not, get it:
        if (!profileImages[msg.sender?.did]) {
          const profileImage = await getProfileImage(msg.sender?.did);
          setProfileImages((prev) => ({
            ...prev,
            [msg.sender?.did]: profileImage,
          }));
        }

        let reactions: strint[] = [];

        if (msg.reactions) {
          for (const reaction of msg.reactions) {
            reactions.push(reaction.value);
          }
        }

        // get the profile image for the sender:
        const profileImage =
          profileImages[msg.sender?.did] ??
          `https://i.pravatar.cc/150?u=${msg.sender?.did}`;

        // extract the first link from the text if it exists:
        let link = msg.text.match(/https?:\/\/[^\s]+/)?.[0];
        // if the link is the entire text, set text to an empty string:
        if (link === msg.text) {
          msg.text = '';
        }

        if (msg.embed) {
          console.log('embed', msg.embed);
          link = msg.embed?.record?.uri;
        }

        let message: IMessage = {
          _id: msg.id,
          text: msg.text,
          createdAt: new Date(msg.sentAt),
          reactions: reactions,
          user: {
            _id: msg.sender?.did || 'unknown',
            name: isSelf
              ? 'You'
              : msg.sender?.displayName || msg.sender?.handle || 'User',
            avatar: profileImage,
          },
          video: link,
        };
        return message;
      })
    );

    return transformedMessages;
  };

  const fetchInitialMessages = async () => {
    if (!agent || !userDid || !groupId) {
      console.error('No agent, userDid, or groupId found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');

      // Fetch conversation details first
      const convoResponse = await proxy.chat.bsky.convo.getConvo({
        convoId: groupId as string,
      });

      const convoData = convoResponse.data.convo;

      // Set conversation name and members
      if (convoData) {
        // For group chats, use the group name. For DMs, use the other user's name
        const otherMembers =
          convoData.members?.filter((member) => member.did !== userDid) || [];

        // console.log(convoData);

        if (convoData.name) {
          setConvoName(convoData.name);
        } else if (otherMembers.length === 1) {
          setConvoName(
            otherMembers[0].displayName || otherMembers[0].handle || 'Chat'
          );
        }

        setConvoMembers(convoData.members || []);
      }

      // Fetch messages
      const messagesData = await getConvoMessages();

      if (messagesData.length == 0) {
        setLoading(false);
        return;
      }

      // Transform messages to GiftedChat format
      const transformedMessages: IMessage[] =
        await transformMessages(messagesData);

      setMessages(transformedMessages);

      // mark these messages as read:
      await proxy.chat.bsky.convo.updateRead({
        convoId: groupId as string,
        messageId: messagesData[0].id,
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Fallback to sample data for demo/testing
      setMessages([
        {
          _id: 0,
          system: true,
          text: "Couldn't load messages from server, showing sample data",
          createdAt: new Date(),
          user: {
            _id: 0,
            name: 'System',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialMessages();
    startMessageListener();
  }, [groupId, agent, userDid]);

  const getConvoMessages = async () => {
    const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
    const messagesResponse = await proxy.chat.bsky.convo.getMessages({
      convoId: groupId as string,
      cursor: cursor,
      limit: 30,
    });
    setCursor(messagesResponse.data.cursor ?? undefined);
    return messagesResponse.data.messages ?? [];
  };

  // Real-time message listener implementation
  const messageListenerRef = useRef<any>(null);

  const startMessageListener = async () => {
    if (!agent || !userDid || !groupId) return;

    try {
      const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');

      // Implement real-time message subscription
      messageListenerRef.current = setInterval(async () => {
        try {
          const newMessagesData = await getConvoMessages();

          if (newMessagesData.length > 0) {
            // Transform new messages
            const transformedMessages =
              await transformMessages(newMessagesData);
            // TODO: this can definitely be optimized!:
            const replacements = transformedMessages;
            const oldMessages = messages;
            for (const msg of oldMessages) {
              if (replacements.some((m) => m._id !== msg._id)) {
                replacements.push(msg);
              }
            }
            setMessages(replacements);

            // const logResponse = await proxy.chat.bsky.convo.getLog({
            //   cursor: cursor,
            // });
            // console.log('logResponse', logResponse);

            // mark these messages as read:
            await proxy.chat.bsky.convo.updateRead({
              convoId: groupId as string,
              messageId: newMessagesData[0].id,
            });
          }
        } catch (error) {
          console.error('Error in message listener:', error);
        }
      }, refreshInterval);
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  };

  const stopMessageListener = () => {
    if (messageListenerRef.current) {
      clearInterval(messageListenerRef.current);
      messageListenerRef.current = null;
    }
  };

  const onSend = useCallback(
    async (newMessages = []) => {
      if (!agent || !userDid || !groupId || newMessages.length === 0) {
        console.error(
          'Cannot send message: missing agent, userDid, groupId, or message'
        );
        return;
      }

      if (newMessages.length === 0) {
        console.error('Cannot send message: missing message');
        return;
      }

      const messageText = newMessages[0].text;
      let embed = undefined;
      // match link in messageText
      const link = messageText.match(/https?:\/\/[^\s]+/)?.[0];
      if (link) {
        embed = {
          record: {
            uri: link,
          },
        };
      }
      // Optimistically update UI
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, newMessages)
      );

      try {
        const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');

        const response = await proxy.chat.bsky.convo.sendMessage({
          convoId: groupId as string,
          message: {
            text: messageText,
            // TODO: facets
            embed: embed,
          },
        });

        console.log('Message sent successfully', response.data);

        // Clear reply state after sending
        setReplyMessage(null);
      } catch (error) {
        console.error('Error sending message:', error);
        // Consider showing an error to the user and/or removing the optimistically added message
      }
    },
    [groupId, agent, userDid, replyMessage]
  );

  const updateRowRef = useCallback(
    (ref: any) => {
      if (
        ref &&
        replyMessage &&
        ref.props.children.props.currentMessage?._id === replyMessage._id
      ) {
        swipeableRowRef.current = ref;
      }
    },
    [replyMessage]
  );

  useEffect(() => {
    if (replyMessage && swipeableRowRef.current) {
      swipeableRowRef.current.close();
      swipeableRowRef.current = null;
    }
  }, [replyMessage]);

  // Get avatar for the chat (either group avatar or the other member's avatar)
  const getConvoAvatar = () => {
    if (convoMembers.length === 0)
      return `https://i.pravatar.cc/150?u=${groupId}`;

    if (convoMembers.length > 2) {
      // For group chats, use a placeholder or generate a group avatar
      return `https://i.pravatar.cc/150?u=group_${groupId}`;
    } else {
      // For DMs, use the other person's avatar
      const otherMember = convoMembers.find((member) => member.did !== userDid);
      return (
        otherMember?.avatar ||
        `https://i.pravatar.cc/150?u=${otherMember?.did || groupId}`
      );
    }
  };

  const addReaction = async (messageId: string, value: string) => {
    const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
    await proxy.chat.bsky.convo.addReaction({
      convoId: groupId as string,
      messageId: messageId,
      value: value,
    });
  };

  const removeReaction = async (messageId: string, value: string) => {
    const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
    await proxy.chat.bsky.convo.removeReaction({
      convoId: groupId as string,
      messageId: messageId,
      value: value,
    });
  };

  // const onLongPressMessage = async (message: IMessage) => {
  //   try {
  //     await addReaction(message._id, '👍');
  //   } catch (error) {
  //     console.error('Error adding reaction:', error);
  //   }
  // };

  const reloadRecentMessages = async () => {
    const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
    const messagesResponse = await proxy.chat.bsky.convo.getMessages({
      convoId: groupId as string,
      cursor: undefined,
      limit: 30,
    });
    setCursor(messagesResponse.data.cursor ?? undefined);
    const transformedMessages: IMessage[] = await transformMessages(
      messagesResponse.data.messages
    );

    setMessages(transformedMessages);
  };

  const onEmojiSelected = async (message: IMessage, emoji: string) => {
    try {
      if (message.reactions.includes(emoji)) {
        await removeReaction(message._id, emoji);
      } else {
        await addReaction(message._id, emoji);
      }
      await reloadRecentMessages();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  return (
    <ChatWrapper
      agent={agent}
      groupId={groupId}
      onPressAvatar={onPressAvatar}
      messages={messages}
      // onLongPressMessage={onLongPressMessage}
      convoMembers={convoMembers}
      onSend={onSend}
      loading={loading}
      onPressLink={onPressLink}
      onEmojiSelected={onEmojiSelected}
    />
  );
};
