import {registerSheet, SheetDefinition} from 'react-native-actions-sheet';
import { ChatActionsSheet, LeaveChatSheet, MessageActionsSheet, SearchCreateSheet } from './chatSheets';
import { Theme, ThemeContexts, ThemedStyle, ThemedStyleArray } from '../../theme';
import { StyleProp } from 'react-native';
import { Agent } from '@atproto/api';
import { Chat } from '../chat/ChatItem';

registerSheet('leaveChatSheet', LeaveChatSheet);
registerSheet('searchCreateSheet', SearchCreateSheet);
registerSheet('messageActionsSheet', MessageActionsSheet);
registerSheet('chatActionsSheet', ChatActionsSheet);

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
        onSubmit: (ids: string[]) => void;
      };
    }>;
    'messageActionsSheet': SheetDefinition<{
      payload: {
        agent: Agent;
      },
    }>;
    'chatActionsSheet': SheetDefinition<{
      payload: {
        agent: Agent;
        chat: Chat;
      },
    }>;
  }
}

export {};