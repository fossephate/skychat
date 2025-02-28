import React, { ReactNode, useEffect, useState } from 'react';
import { AuthProvider } from './AuthContext';
import { ConvoProvider } from './ConvoContext';
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

  return (
    <AuthProvider>
      <ConvoProvider>
        {children}
      </ConvoProvider>
    </AuthProvider>
  );
} 