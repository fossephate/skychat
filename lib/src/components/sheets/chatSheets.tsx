import ActionSheet, {
  SheetManager,
  SheetProps,
  useSheetRef,
} from 'react-native-actions-sheet';
import { View, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '../../utils/useAppTheme';
import { ThemedStyle } from '../../theme';
import { Button, Text } from '../../components/';
import { SearchCreate } from '../chat/SearchCreate';
import { useStrings } from '../../contexts/strings';
import { FontAwesome } from '@expo/vector-icons';
import { Agent } from '@atproto/api';
import { useEffect, useState } from 'react';
import { Chat } from '../chat/ChatItem';

function muteConvo(agent: Agent, convoId: string) {}

function leaveConvo(agent: Agent, convoId: string) {}

export function LeaveChatSheet(props: SheetProps<'leaveChatSheet'>) {
  const s = useStrings();
  const ref = useSheetRef();
  const { themed, theme } = useAppTheme();

  return (
    <ActionSheet
      id={props.sheetId}
      useBottomSafeAreaPadding
      containerStyle={{ backgroundColor: theme.colors.background }}
    >
      <View style={themed($leaveChatSheetContainer)}>
        <Text text={s('leaveChat')} style={themed($leaveChatSheetTitle)} />
        <Text
          text={s('leaveChatConfirmation1')}
          style={themed($leaveChatSheetText)}
        />
        <Text
          text={s('leaveChatConfirmation2')}
          style={themed($leaveChatSheetText)}
        />
        <Button
          onPress={props.payload?.onLeave}
          style={themed($leaveChatSheetButton)}
        >
          <Text text={s('leave')} />
        </Button>
        <Button onPress={() => ref.current?.hide()} style={{ marginTop: 6 }}>
          <Text text={s('cancel')} />
        </Button>
      </View>
    </ActionSheet>
  );
}

// action sheet styles
const $leaveChatSheetContainer: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  paddingBottom: spacing.xl,
  paddingTop: spacing.md,
  paddingHorizontal: spacing.lg,
  backgroundColor: colors.background,
  color: colors.text,
});

const $leaveChatSheetTitle: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 24,
  paddingBottom: 8,
  fontWeight: 'bold',
  color: colors.text,
});

const $leaveChatSheetText: ThemedStyle<TextStyle> = ({ colors, spacing }) => ({
  fontSize: 16,
  paddingBottom: 8,
  color: colors.text,
});

const $leaveChatSheetButton: ThemedStyle<ViewStyle> = ({
  colors,
  spacing,
}) => ({
  marginTop: spacing.md,
  backgroundColor: colors.error,
});

export function SearchCreateSheet(props: SheetProps<'searchCreateSheet'>) {
  const ref = useSheetRef();
  const { theme } = useAppTheme();
  const { agent } = props.payload!;

  if (!agent) {
    return (
      <View style={{ height: 650 }}>
        <Text>No agent</Text>
      </View>
    );
  }

  return (
    <ActionSheet
      id={props.sheetId}
      useBottomSafeAreaPadding
      keyboardHandlerEnabled={false}
      gestureEnabled={false}
      containerStyle={{ backgroundColor: theme.colors.background }}
    >
      <View style={{ height: 650 }}>
        <SearchCreate
          agent={props.payload?.agent}
          onSubmit={props.payload?.onSubmit}
        />
      </View>
    </ActionSheet>
  );
}

export function ProfileActionsSheet(props: SheetProps<'profileActionsSheet'>) {
  const s = useStrings();
  const ref = useSheetRef();
  const { themed, theme } = useAppTheme();
  // const { agent, did, onProfile } = props.payload!;

  if (!agent) {
    return (
      <View style={{ height: 650 }}>
        <Text>No agent</Text>
      </View>
    );
  }

  return (
    <ActionSheet
      id={props.sheetId}
      useBottomSafeAreaPadding
      keyboardHandlerEnabled={false}
      gestureEnabled={true}
      containerStyle={{ backgroundColor: theme.colors.background }}
    >
      <View style={{ height: 400 }}>
        <Text>Profile Actions</Text>

        {/* <View style={themed($btnsContainer)}>
          <View style={themed($btnGroup)}>
            <Button style={themed($btn)} onPress={onProfile}>
              <Text>Go to profile</Text>
            </Button>
          </View>

          <View style={themed($btnGroup)}>
            <Button style={themed($btn)} onPress={() => handleBlockUser(agent, did)}>
              <Text>Block account</Text>
            </Button>
          </View>
        </View> */}
      </View>
    </ActionSheet>
  );
}

const handleBlockUser = async (agent: Agent, did: string) => {
  // SheetManager.hide('profileActionsSheet');
  // try {
  //   if (!agent) {
  //     return;
  //   }
};

const handleMuteChat = async (agent: Agent, chat: Chat) => {
  SheetManager.hide('chatActionsSheet');
  try {
    if (!chat) {
      return;
    }
    const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
    if (chat.muted) {
      await proxy.chat.bsky.convo.unmuteConvo({ convoId: chat?.id });
    } else {
      await proxy.chat.bsky.convo.muteConvo({
        convoId: chat?.id,
      });
    }
  } catch (error) {
    console.error('Error muting chat:', error);
  }
};

const handleLeaveChat = async (agent: Agent, chat: Chat) => {
  // SheetManager.hide('chatActionsSheet');

  SheetManager.show('leaveChatSheet', {
    payload: {
      onLeave: async () => {
        try {
          if (!chat) {
            return;
          }
          const proxy = agent.withProxy('bsky_chat', 'did:web:api.bsky.chat');
          await proxy.chat.bsky.convo.leaveConvo({ convoId: chat?.id });
        } catch (error) {
          console.error('Error leaving chat:', error);
        }
      },
    },
  });
};

export function ChatActionsSheet(props: SheetProps<'chatActionsSheet'>) {
  const s = useStrings();
  const ref = useSheetRef();
  const { themed, theme } = useAppTheme();
  const { agent, onProfile, chat } = props.payload!;

  if (!agent) {
    return (
      <View style={{ height: 650 }}>
        <Text>No agent</Text>
      </View>
    );
  }

  useEffect(() => {}, []);

  return (
    <ActionSheet
      id={props.sheetId}
      useBottomSafeAreaPadding
      keyboardHandlerEnabled={false}
      gestureEnabled={true}
      containerStyle={{ backgroundColor: theme.colors.background }}
    >
      <View style={{ height: 250 }}>
        {/* <Text>Chat Actions</Text> */}

        <View style={themed($btnsContainer)}>
          <View style={themed($btnGroup)}>
            {onProfile && (
              <Button
                style={[themed($btn), themed($btnTop)]}
                onPress={onProfile}
                RightAccessory={() => (
                  <FontAwesome
                    name="user"
                    size={24}
                    color={theme.colors.text}
                  />
                )}
              >
                <Text>Go to profile</Text>
              </Button>
            )}
            <Button
              style={[themed($btn), themed($btnBottom)]}
              onPress={() => handleMuteChat(agent, chat)}
              RightAccessory={() => (
                <FontAwesome
                  name="volume-off"
                  size={24}
                  color={theme.colors.text}
                />
              )}
            >
              {chat.muted ? (
                <Text>Unmute conversation</Text>
              ) : (
                <Text>Mute conversation</Text>
              )}
            </Button>
          </View>

          {/* <View style={themed($btnGroup)}>
            <Button
              style={[themed($btn), themed($btnTop)]}
              onPress={() => {}}
              RightAccessory={() => (
                <FontAwesome name="ban" size={24} color={theme.colors.text} />
              )}
            >
              <Text>Block account</Text>
            </Button>
            <Button
              style={[themed($btn), themed($btnBottom)]}
              onPress={() => ref.current?.hide()}
              RightAccessory={() => (
                <FontAwesome name="flag" size={24} color={theme.colors.text} />
              )}
            >
              <Text>Report conversation</Text>
            </Button>
          </View> */}

          <View style={themed($btnGroup)}>
            <Button
              style={[themed($btn), { backgroundColor: theme.colors.error }]}
              onPress={() => handleLeaveChat(agent, chat)}
              LeftAccessory={() => <Text>Leave chat</Text>}
              RightAccessory={() => (
                <FontAwesome
                  name="sign-out"
                  size={24}
                  color={theme.colors.text}
                />
              )}
            ></Button>
          </View>
        </View>
      </View>
    </ActionSheet>
  );
}

const $btn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderRadius: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
  justifyContent: 'space-between',
  backgroundColor: 'transparent',
});

const $btnBottom: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
});

const $btnTop: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
});

const $btnGroup: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 0,
  // padding: spacing.sm,
  // width: '80%',
  backgroundColor: colors.palette.neutral300,
  borderRadius: spacing.md,
  // borderWidth: 1,
  // borderColor: colors.border,
});

const $btnsContainer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: spacing.sm,
  width: '80%',
  marginHorizontal: 'auto',
  alignSelf: 'center',
  marginTop: spacing.sm,
});

export function MessageActionsSheet(props: SheetProps<'messageActionsSheet'>) {
  const ref = useSheetRef();
  const { theme } = useAppTheme();
  if (!props.payload?.agent) {
    return (
      <View style={{ height: 650 }}>
        <Text>No agent</Text>
      </View>
    );
  }

  return (
    <ActionSheet
      id={props.sheetId}
      useBottomSafeAreaPadding
      keyboardHandlerEnabled={false}
      gestureEnabled={false}
      containerStyle={{ backgroundColor: theme.colors.background }}
    >
      <View style={{ height: 650 }}>
        <Text>Message Actions</Text>
        <Button onPress={() => {}}>
          <Text>React</Text>
        </Button>
        <Button onPress={() => ref.current?.hide()}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </ActionSheet>
  );
}
