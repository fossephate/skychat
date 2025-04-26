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
      };
    }>;
    'searchCreateSheet': SheetDefinition<{
      payload: {
        agent: Agent;
      };
    }>;
  }
}

export {};