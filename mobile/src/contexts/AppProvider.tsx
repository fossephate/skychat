import React, { ReactNode, useEffect, useState } from 'react';
import { AuthProvider } from './AuthContext';
import { ChatProvider, ConvoProvider } from 'skychat-lib';
import { SplashScreen, router } from 'expo-router';

interface AppProviderProps {
  children: ReactNode;
  loaded: boolean;
}

export function AppProvider({ children, loaded }: AppProviderProps) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    (async () => {
      if (loaded && !initialized) {
        SplashScreen.hideAsync();

        setInitialized(true);
      }
    })();
  }, [loaded, initialized]);

  if (!loaded) {
    return null;
  }


  const newS = (key: string) => {
    const strings = {
      clearSelection: "Clear",
      accept: "Accept",
      reject: "Reject",
      cancel: "Cancel",
      leave: "Leave",
      leaveChat: "Leave Conversation",
      leaveChatConfirmation1: "Are you sure you want to leave this conversation?",
      leaveChatConfirmation2: "Your messages will be deleted for you, but not for the other participants.",
      bskyDmHeader: "Bluesky DMs",
      skyDmHeader: "Skychats",
      newDm: "New DM",
      newChat: "New Group",
      chatRequests: "Chat request",
    };
  
    try {
      return strings[key as keyof typeof strings];
    } catch (error) {
      console.error(`String key ${key} not found`);
      return "Error: String key not found";
    }
  };




  return (
    <AuthProvider>
      <ConvoProvider>
        {/* <ChatProvider stringsOverride={newS}> */}
        <ChatProvider>
          {children}
        </ChatProvider>
      </ConvoProvider>
    </AuthProvider>
  );
} 