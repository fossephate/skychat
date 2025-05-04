import ActionSheet, {
  SheetProps,
  useSheetRef,
} from 'react-native-actions-sheet';
import { View, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '../../utils/useAppTheme';
import { ThemedStyle } from '../../theme';
import { Button, Text } from '../../components/';
import { SearchCreate } from '../chat/SearchCreate';
import { useStrings } from '../../contexts/strings';

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
        <SearchCreate
          agent={props.payload?.agent}
          onSubmit={props.payload?.onSubmit}
        />
      </View>
    </ActionSheet>
  );
}

export function ChatActionsSheet(props: SheetProps<'chatActionsSheet'>) {
  const s = useStrings();
  const ref = useSheetRef();
  const { themed, theme } = useAppTheme();

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
      <View style={{ height: 400 }}>
        <Text>Chat Actions</Text>

        <View style={themed($btnsContainer)}>
          <View style={themed($btnGroup)}>
            <Button style={themed($btn)} onPress={() => {}}>
              <Text>Go to profile</Text>
            </Button>
            <Button style={themed($btn)} onPress={() => ref.current?.hide()}>
              <Text>Mute conversation</Text>
            </Button>
          </View>

          <View style={themed($btnGroup)}>
            <Button style={themed($btn)} onPress={() => {}}>
              <Text>Block account</Text>
            </Button>
            <Button style={themed($btn)} onPress={() => ref.current?.hide()}>
              <Text>Report conversation</Text>
            </Button>
          </View>

          <View style={themed($btnGroup)}>
            <Button style={themed($btn)} onPress={() => ref.current?.hide()}
              LeftAccessory={() => (
                <Text>Leave chat</Text>
              )}
              // RightAccessory={() => (
              // )}
            >
            </Button>
          </View>
        </View>
      </View>
    </ActionSheet>
  );
}

const $btn: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  // padding: spacing.sm,
  borderRadius: spacing.xl,
  // borderWidth: 1,
  // borderColor: colors.border,
});

const $btnGroup: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 0,
  // padding: spacing.sm,
  // width: '80%',
  backgroundColor: colors.palette.neutral300,
  borderRadius: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
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
