import React, { useState } from 'react';
// import { useThemeProvider } from "./theme-provider"; // Adjust the import path as needed
// import { StringProvider, StringsType } from "./string-localization";
import { useThemeProvider } from '../utils/useAppTheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetProvider } from 'react-native-actions-sheet';
import { StringFunction, StringProvider } from './strings';
import { ConvoProvider } from './ConvoContext';
import { Theme } from '../theme';

interface ChatProviderProps {
  initialTheme?: 'light' | 'dark' | undefined;
  stringsOverride?: StringFunction;
  lightThemeOverride?: Theme;
  darkThemeOverride?: Theme;
  children: React.ReactNode;
}

/**
 * Combined provider that sets up both theme and string localization contexts
 */
export const ChatProvider = ({
  initialTheme,
  stringsOverride,
  lightThemeOverride,
  darkThemeOverride,
  children,
}: ChatProviderProps) => {
  const { themeScheme, setThemeContextOverride, ThemeProvider } =
    useThemeProvider(initialTheme, lightThemeOverride, darkThemeOverride);

  let override;
  if (stringsOverride) {
    override = (originalS: StringFunction) => stringsOverride;
  }

  return (
    <GestureHandlerRootView>
      <SheetProvider context="global">
        <ConvoProvider>
          <StringProvider overrideS={override}>
            {/* @ts-ignore */}
            <ThemeProvider value={{ themeScheme, setThemeContextOverride }}>
              {children}
            </ThemeProvider>
          </StringProvider>
        </ConvoProvider>
      </SheetProvider>
    </GestureHandlerRootView>
  );
};
