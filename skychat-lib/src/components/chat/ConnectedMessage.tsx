// import React from 'react';
// import { View } from 'react-native';
// import { Message, IMessage, User } from 'react-native-gifted-chat';
// import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import Animated from 'react-native-reanimated';

// const ConnectedMessage = ({
//   currentMessage,
//   position,
//   renderRightAction,
//   onSwipeOpenAction,
//   updateRowRef,
//   ...props
// }) => {
//   const isReply = currentMessage?.replyTo;

//   return (
//     <GestureHandlerRootView>
//       <View style={{ position: 'relative' }}>
//         {isReply && (
//           <View
//             style={{
//               position: 'absolute',
//               right: position === 'right' ? '100%' : 'auto',
//               left: position === 'left' ? '100%' : 'auto',
//               top: 0,
//               bottom: 0,
//               width: 20,
//               alignItems: position === 'right' ? 'flex-end' : 'flex-start'
//             }}
//           >
//             <View
//               style={{
//                 width: 2,
//                 height: '100%',
//                 backgroundColor: '#89BC0C',
//                 opacity: 0.5
//               }}
//             />
//           </View>
//         )}
//         <Swipeable
//           ref={updateRowRef}
//           friction={2}
//           rightThreshold={40}
//           renderLeftActions={renderRightAction}
//           onSwipeableWillOpen={onSwipeOpenAction}
//         >
//           <Message
//             currentMessage={currentMessage}
//             position={position}
//             user={{} as User}
//             {...props}
//           />
//         </Swipeable>
//       </View>
//     </GestureHandlerRootView>
//   );
// };

// export default ConnectedMessage;