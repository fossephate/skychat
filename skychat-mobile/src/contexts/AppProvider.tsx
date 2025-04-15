import React, { ReactNode, useEffect, useState } from 'react';
import { AuthProvider } from './AuthContext';
import { ConvoProvider } from 'skychat-lib';
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

  console.log("ConvoProvider", ConvoProvider);

  return (
    <AuthProvider>
      <ConvoProvider>
        {children}
      </ConvoProvider>
    </AuthProvider>
  );
} 