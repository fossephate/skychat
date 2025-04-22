import { ActivityIndicator, Text } from 'react-native';
import { View } from 'react-native';

export const LoadingView = () => {
  return (
    <View style={{
      flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }}>
        <ActivityIndicator size="large" />
      </View>

    // <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    //   <Text>Loading...</Text>
    // </View>
  );
};
