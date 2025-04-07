// ChatMessageBox.tsx
import { useAppTheme } from '@/utils/useAppTheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { IMessage, Message, MessageProps } from 'react-native-gifted-chat';
import { isSameDay, isSameUser } from 'react-native-gifted-chat/lib/utils';

type ChatMessageBoxProps = {
  setReplyOnSwipeOpen: (message: IMessage) => void;
  updateRowRef: (ref: any) => void;
  replyToMessage?: IMessage;
} & MessageProps<IMessage>;

const ChatMessageBox = ({ setReplyOnSwipeOpen, updateRowRef, replyToMessage, ...props }: ChatMessageBoxProps) => {
  const { theme } = useAppTheme();

  const isNextMyMessage =
    props.currentMessage &&
    props.nextMessage &&
    isSameUser(props.currentMessage, props.nextMessage) &&
    isSameDay(props.currentMessage, props.nextMessage);

  const renderRightAction = (progressAnimatedValue: Animated.AnimatedInterpolation<any>) => {
    const size = progressAnimatedValue.interpolate({
      inputRange: [0, 1, 100],
      outputRange: [0, 1, 1],
    });
    const trans = progressAnimatedValue.interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0, 12, 20],
    });

    return (
      <Animated.View
        style={[
          styles.container,
          { transform: [{ scale: size }, { translateX: trans }] },
          isNextMyMessage ? styles.defaultBottomOffset : styles.bottomOffsetNext,
          props.position === 'right' && styles.leftOffsetValue,
        ]}>
        <View style={styles.replyImageWrapper}>
          <MaterialCommunityIcons name="reply-circle" size={26} color={theme.colors.palette.neutral300} />
        </View>
      </Animated.View>
    );
  };

  const onSwipeOpenAction = () => {
    if (props.currentMessage) {
      setReplyOnSwipeOpen({ ...props.currentMessage });
    }
  };

  const isReplyMessage = props.currentMessage?.replyTo;

  return (
    <GestureHandlerRootView>
      <View style={styles.messageContainer}>
        {/* Reply Connection Line */}
        {isReplyMessage && (
          <View style={[
            styles.replyLine,
            props.position === 'left' ? styles.replyLineLeft : styles.replyLineRight,
          ]} />
        )}

        {/* Reply Header */}
        {isReplyMessage && (
          <View style={[
            styles.replyHeader,
            props.position === 'left' ? styles.replyHeaderLeft : styles.replyHeaderRight,
          ]}>
            <MaterialCommunityIcons
              name="reply"
              size={16}
              color={theme.colors.palette.primary300}
            />
            <Text style={styles.replyHeaderText}>
              {props.currentMessage?.replyTo.user.name}
            </Text>
          </View>
        )}

        <Swipeable
          ref={updateRowRef}
          friction={2}
          rightThreshold={40}
          renderLeftActions={renderRightAction}
          onSwipeableWillOpen={onSwipeOpenAction}>
          <Message {...props} />
        </Swipeable>
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    position: 'relative',
    marginVertical: 2,
  },
  container: {
    width: 40,
  },
  replyImageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyImage: {
    width: 20,
    height: 20,
  },
  defaultBottomOffset: {
    marginBottom: 2,
  },
  bottomOffsetNext: {
    marginBottom: 10,
  },
  leftOffsetValue: {
    marginLeft: 16,
  },
  replyLine: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#89BC0C',
    opacity: 0.5,
    top: -10,
  },
  replyLineLeft: {
    left: 10,
  },
  replyLineRight: {
    right: 10,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: -20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(137, 188, 12, 0.1)',
  },
  replyHeaderLeft: {
    left: 0,
  },
  replyHeaderRight: {
    right: 0,
  },
  replyHeaderText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#89BC0C',
  },
});

export default ChatMessageBox;