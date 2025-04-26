import {registerSheet, SheetDefinition} from 'react-native-actions-sheet';
import { LeaveChatSheet, SearchCreateSheet } from './chatSheets';
import { Theme, ThemeContexts, ThemedStyle, ThemedStyleArray } from '../../theme';
import { StyleProp } from 'react-native';
import { Agent } from '@atproto/api';

registerSheet('leaveChatSheet', LeaveChatSheet);
registerSheet('searchCreateSheet', SearchCreateSheet);

// We extend some of the types here to give us great intellisense
// across the app for all registered sheets.
declare module 'react-native-actions-sheet' {
  interface Sheets {
    'leaveChatSheet': SheetDefinition<{
      payload: {
        onLeave: () => void;
        themed: <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => T;
        // theme: Theme;
        themeContext: ThemeContexts;
      };
    }>;
    'searchCreateSheet': SheetDefinition<{
      payload: {
        themed: <T>(styleOrStyleFn: ThemedStyle<T> | StyleProp<T> | ThemedStyleArray<T>) => T;
        // theme: Theme;
        // themeContext: ThemeContexts;
        agent: Agent;
      };
    }>;
  }
}

export {};