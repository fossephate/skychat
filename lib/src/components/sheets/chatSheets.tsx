import ActionSheet, {
  SheetProps,
  useSheetRef,
} from 'react-native-actions-sheet';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '../../utils/useAppTheme';
import { ThemedStyle } from '../../theme';
import { Button } from '../../components/';
import { UserList } from '../../components/chat/UserList';
import { Screen } from '../Screen';

export function LeaveChatSheet(props: SheetProps<'leaveChatSheet'>) {
  const { themed: backupThemed } = useAppTheme();
  const ref = useSheetRef();
  let themed = props.payload?.themed;

  if (!themed) {
    themed = backupThemed;
  }

  return (
    <ActionSheet id={props.sheetId}>
      <View style={themed($leaveChatSheetContainer)}>
        <Text style={themed($leaveChatSheetTitle)}>Leave Conversation</Text>
        <Text style={themed($leaveChatSheetText)}>
          Are you sure you want to leave this conversation?
        </Text>
        <Text style={themed($leaveChatSheetText)}>
          Your messages will be deleted for you, but not for the other
          participant.
        </Text>
        <Button
          onPress={props.payload?.onLeave}
          style={themed($leaveChatSheetButton)}
        >
          <Text>Leave</Text>
        </Button>
        <Button onPress={() => ref.current?.hide()} style={{ marginTop: 6 }}>
          <Text>Cancel</Text>
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
  const { themed: backupThemed } = useAppTheme();
  const ref = useSheetRef();
  let themed = props.payload?.themed;

  if (!themed) {
    themed = backupThemed;
  }
  if (!props.payload?.agent) {
    return (
      <View>
        <Text>No agent</Text>
      </View>
    );
  }

  return (
    <ActionSheet id={props.sheetId}>
      <Screen>
        <View style={{ height: 650, paddingBottom: 32 }}>
          <UserList agent={props.payload?.agent} />
        </View>
      </Screen>
    </ActionSheet>
  );
}
