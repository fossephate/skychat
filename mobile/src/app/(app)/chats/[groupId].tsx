// import ChatMessageBox from '@/components/Chat/ChatMessageBox';
// import ReplyMessageBar from '@/components/Chat/ReplyMessageBar';
import { Ionicons } from '@expo/vector-icons';
// import React, { useState, useCallback, useEffect, useRef } from 'react';
// import { ImageBackground, StyleSheet, View, ViewStyle } from 'react-native';
// import { Swipeable } from 'react-native-ge, ViewStylesture-handler';
// import {
//   GiftedChat,
//   Bubble,
//   InputToolbar,
//   Send,
//   SystemMessage,
//   IMessage,
// } from 'react-native-gifted-chat';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
import messageData from 'assets/data/messages.json';
// import { useAppTheme } from '@/utils/useAppTheme';
import { ThemedStyle } from '@/theme';

import ChatMessageBox from "@/components/Chat/ChatMessageBox";
import ReplyMessageBar from "@/components/Chat/ReplyMessageBar";
import { useAppTheme } from "@/utils/useAppTheme";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { ImageBackground, View, ViewStyle, Image } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { IMessage, GiftedChat, SystemMessage, Bubble, Send, InputToolbar } from "react-native-gifted-chat";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Text } from '@/components';
import { router } from 'expo-router';

const Page = () => {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();

  const [replyMessage, setReplyMessage] = useState<IMessage | null>(null);
  const swipeableRowRef = useRef<Swipeable | null>(null);

  const { themed, theme } = useAppTheme();


  useEffect(() => {
    setMessages([
      ...messageData.map((message: any) => {
        return {
          _id: message.id,
          text: message.msg,
          createdAt: new Date(message.date),
          user: {
            _id: message.from,
            name: message.from ? 'You' : 'Bob',
          },
        };
      }),
      {
        _id: 0,
        system: true,
        text: 'All your base are belong to us',
        createdAt: new Date(),
        user: {
          _id: 0,
          name: 'Bot',
        },
      },
    ]);
  }, []);

  const onSend = useCallback((messages = []) => {
    setMessages((previousMessages: any[]) => GiftedChat.append(previousMessages, messages));
  }, []);

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={{ backgroundColor: theme.colors.background }}
        renderActions={() => (
          <View style={{ height: 44, justifyContent: 'center', alignItems: 'center', left: 5 }}>
            <Ionicons name="add" color={theme.colors.palette.primary300} size={28} />
          </View>
        )}
      />
    );
  };

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

  return (
    // <ImageBackground
    //   // source={require('@/assets/images/pattern.png')}
    //   style={{
    //     flex: 1,
    //     backgroundColor: theme.colors.background,
    //     marginBottom: insets.bottom,
    //   }}>
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Header title="Chat with Bob" leftIcon="back" onLeftPress={() => router.back()} />
      <GiftedChat
        messages={messages}
        onSend={(messages: any) => onSend(messages)}
        onInputTextChanged={setText}
        user={{
          _id: 1,
        }}
        renderSystemMessage={(props) => (
          <SystemMessage {...props} textStyle={{ color: theme.colors.palette.neutral300 }} />
        )}
        bottomOffset={insets.bottom}
        renderAvatar={() => {
          // use pravatar:
          const groupId = "123";
          return <Image source={{ uri: `https://i.pravatar.cc/150?u=${groupId}` }} style={{ width: 32, height: 32 }} />
        }}
        maxComposerHeight={100}
        textInputProps={themed($composer)}
        renderBubble={(props) => {
          return (
            <Bubble
              {...props}
              textStyle={{
                right: {
                  color: '#000',
                },
              }}
              wrapperStyle={{
                left: {
                  backgroundColor: '#fff',
                },
                right: {
                  backgroundColor: theme.colors.palette.secondary300,
                },
              }}
            />
          );
        }}
        // renderAccessory={() => {
        //   const groupId = "456";
        //   return <Image source={{ uri: `https://i.pravatar.cc/150?u=${groupId}` }} style={{ width: 32, height: 32 }} />
        // }}
        isTyping={true}
        infiniteScroll
        onPressActionButton={() => {
          console.log("action button pressed");
        }}
        isScrollToBottomEnabled={true}
        renderSend={(props) => (
          <View
            style={{
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              paddingHorizontal: 14,
            }}>
            {text === '' && (
              <>
                <Ionicons name="camera-outline" color={theme.colors.palette.primary300} size={28} />
                <Ionicons name="mic-outline" color={theme.colors.palette.primary300} size={28} />
              </>
            )}
            {text !== '' && (
              <Send
                {...props}
                containerStyle={{
                  justifyContent: 'center',
                }}>
                <Ionicons name="send" color={theme.colors.palette.primary300} size={28} />
              </Send>
            )}
          </View>
        )}
        renderInputToolbar={renderInputToolbar}
        renderChatFooter={() => (
          <ReplyMessageBar clearReply={() => setReplyMessage(null)} message={replyMessage} />
        )}
        // onLongPress={(context, message) => setReplyMessage(message)}
        renderMessage={(props) => (
          <ChatMessageBox
            {...props}
            setReplyOnSwipeOpen={setReplyMessage}
            updateRowRef={updateRowRef}
          />
        )}
      />
    </SafeAreaView>
    // </ImageBackground>
  );
};

const $composer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  backgroundColor: '#fff',
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  paddingHorizontal: 10,
  paddingTop: 8,
  fontSize: 16,
  marginVertical: 4,
})

// const styles = StyleSheet.create({
//   composer: {
//     backgroundColor: '#fff',
//     borderRadius: 18,
//     borderWidth: 1,
//     borderColor: theme.colors.palette.neutral300,
//     paddingHorizontal: 10,
//     paddingTop: 8,
//     fontSize: 16,
//     marginVertical: 4,
//   },
// });

export default Page;



// // Page.tsx
// const Page = () => {
//   const [messages, setMessages] = useState<IMessage[]>([]);
//   const [text, setText] = useState('');
//   const insets = useSafeAreaInsets();
//   const [replyMessage, setReplyMessage] = useState<IMessage | null>(null);
//   const swipeableRowRef = useRef<Swipeable | null>(null);
//   const { theme, themed } = useAppTheme();

//   useEffect(() => {
//     setMessages([
//       ...messageData.map((message: any) => ({
//         _id: message.id,
//         text: message.msg,
//         createdAt: new Date(message.date),
//         user: {
//           _id: message.from,
//           name: message.from ? 'You' : 'Bob',
//         },
//         // Add replyTo if this message is a reply
//         ...(message.replyTo && {
//           replyTo: {
//             _id: message.replyTo.id,
//             user: {
//               _id: message.replyTo.from,
//               name: message.replyTo.from ? 'You' : 'Bob',
//             },
//           },
//         }),
//       })),
//       {
//         _id: 0,
//         system: true,
//         text: 'All your base are belong to us',
//         createdAt: new Date(),
//         user: {
//           _id: 0,
//           name: 'Bot',
//         },
//       },
//     ]);
//   }, []);

//   const onSend = useCallback((newMessages: any[]) => {
//     setMessages((previousMessages: any[]) => {
//       const messagesToAdd = newMessages.map((message: any) => ({
//         ...message,
//         // Add reply information if there's a message being replied to
//         ...(replyMessage && {
//           replyTo: {
//             _id: replyMessage._id,
//             user: replyMessage.user,
//           },
//         }),
//       }));
      
//       return GiftedChat.append(previousMessages, messagesToAdd);
//     });
    
//     // Clear reply state after sending
//     setReplyMessage(null);
//   }, [replyMessage]);

//   const renderInputToolbar = (props: any) => {
//     return (
//       <InputToolbar
//         {...props}
//         containerStyle={{ backgroundColor: theme.colors.background }}
//         renderActions={() => (
//           <View style={{ height: 44, justifyContent: 'center', alignItems: 'center', left: 5 }}>
//             <Ionicons name="add" color={theme.colors.palette.primary300} size={28} />
//           </View>
//         )}
//       />
//     );
//   };

//   const updateRowRef = useCallback(
//     (ref: any) => {
//       if (
//         ref &&
//         replyMessage &&
//         ref.props.children.props.currentMessage?._id === replyMessage._id
//       ) {
//         swipeableRowRef.current = ref;
//       }
//     },
//     [replyMessage]
//   );

//   useEffect(() => {
//     if (replyMessage && swipeableRowRef.current) {
//       swipeableRowRef.current.close();
//       swipeableRowRef.current = null;
//     }
//   }, [replyMessage]);

//   return (
//     <ImageBackground
//       style={{
//         flex: 1,
//         backgroundColor: theme.colors.background,
//         marginBottom: insets.bottom,
//       }}>
//       <GiftedChat
//         messages={messages}
//         onSend={onSend}
//         onInputTextChanged={setText}
//         user={{
//           _id: 1,
//         }}
//         renderSystemMessage={(props) => (
//           <SystemMessage {...props} textStyle={{ color: theme.colors.palette.neutral300 }} />
//         )}
//         bottomOffset={insets.bottom}
//         renderAvatar={null}
//         maxComposerHeight={100}
//         textInputProps={themed($composer)}
//         renderBubble={(props) => (
//           <Bubble
//             {...props}
//             textStyle={{
//               right: {
//                 color: '#000',
//               },
//             }}
//             wrapperStyle={{
//               left: {
//                 backgroundColor: '#fff',
//               },
//               right: {
//                 backgroundColor: theme.colors.palette.secondary300,
//               },
//             }}
//           />
//         )}
//         renderSend={(props) => (
//           <View
//             style={{
//               height: 44,
//               flexDirection: 'row',
//               alignItems: 'center',
//               justifyContent: 'center',
//               gap: 14,
//               paddingHorizontal: 14,
//             }}>
//             {text === '' && (
//               <>
//                 <Ionicons name="camera-outline" color={theme.colors.palette.primary300} size={28} />
//                 <Ionicons name="mic-outline" color={theme.colors.palette.primary300} size={28} />
//               </>
//             )}
//             {text !== '' && (
//               <Send
//                 {...props}
//                 containerStyle={{
//                   justifyContent: 'center',
//                 }}>
//                 <Ionicons name="send" color={theme.colors.palette.primary300} size={28} />
//               </Send>
//             )}
//           </View>
//         )}
//         renderInputToolbar={renderInputToolbar}
//         renderChatFooter={() => (
//           <ReplyMessageBar clearReply={() => setReplyMessage(null)} message={replyMessage} />
//         )}
//         onLongPress={(context, message) => setReplyMessage(message)}
//         renderMessage={(props) => (
//           <ChatMessageBox
//             {...props}
//             setReplyOnSwipeOpen={setReplyMessage}
//             updateRowRef={updateRowRef}
//           />
//         )}
//       />
//     </ImageBackground>
//   );
// };

// const $composer: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
//   backgroundColor: '#fff',
//   borderRadius: 18,
//   borderWidth: 1,
//   borderColor: colors.palette.neutral300,
//   paddingHorizontal: 10,
//   paddingTop: 8,
//   fontSize: 16,
//   marginVertical: 4,
// })

// export default Page;