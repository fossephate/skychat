import { ProfileViewBasic, VerificationState } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { FontAwesome } from '@expo/vector-icons';
import { ActivityIndicator, Text } from 'react-native';
import { View } from 'react-native';

export const LoadingView = () => {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ActivityIndicator size="large" />
    </View>
  );
};


export const blueCheck = () => {
  return (
    <View
      style={{
        backgroundColor: '#208bfe',
        borderRadius: 30,
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <FontAwesome name="check" size={12} color="white" />
    </View>
  );
};


export const isVerified = (verification: VerificationState | undefined) => {
  return verification?.trustedVerifierStatus === "valid" ;
};

export const isVerifier = (verification: VerificationState | undefined) => {
  return verification?.trustedVerifierStatus === "valid" ;
};


export function canBeMessaged(profile: any) {
  switch (profile.associated?.chat?.allowIncoming) {
    case 'none':
      return false
    case 'all':
      return true
    // default to following
    case 'following':
    case undefined:
      return Boolean(profile.viewer?.followedBy)
    default:
      return false
  }
}