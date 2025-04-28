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
import { useEffect } from 'react';

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
