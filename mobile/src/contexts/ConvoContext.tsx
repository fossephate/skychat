import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConvoClient } from "@/utils/convo";
import { ConvoChatWrapper, SerializedCredentialsWrapper } from 'skychat-lib';
// import { ConvoClient } from "skychat-lib";

import { 
  saveManagerStateToStorage, 
  loadManagerStateFromStorage, 
  clearManagerStateFromStorage 
} from '@/utils/storage/credential-storage';

// Define the types for our messages and groups
interface Message {
  text: string;
  senderId: string;
  timestamp: number;
}

interface Group {
  id: string;
  name: string;
  messages: Message[];
  globalIndex: number;
}

interface User {
  userId: string;
  name: string;
}

// Define the context type
interface ConvoContextType {
  client: ConvoClient | null;
  groups: Group[];
  users: User[];
  connected: boolean;
  isConnected: boolean;
  // initClient: (id: string) => void;
  // connect: (serverAddress: string) => Promise<void>;
  initAndConnect: (serverAddress: string, id: string) => Promise<void>;
  createGroup: (name: string, userids: string[]) => Promise<string>;
  sendMessage: (groupId: ArrayBuffer, text: string) => void;
  getGroups: () => Promise<void>;
  acceptPendingInvite: (welcomeMessage: ArrayBuffer) => Promise<ArrayBuffer>;
  rejectPendingInvite: (welcomeMessage: ArrayBuffer) => Promise<void>;
  getChats: () => Promise<ConvoChatWrapper[]>;
  getGroupChat: (groupId: string) => Promise<ConvoChatWrapper>;
  saveManagerState: () => SerializedCredentialsWrapper;
  loadManagerState: (state: SerializedCredentialsWrapper) => void;
  getGroupIdWithUsers: (userids: string[]) => string;
  clearManagerState: () => void;
}

// Create the context with a default value
const ConvoContext = createContext<ConvoContextType | undefined>(undefined);

// Provider component
export function ConvoProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConvoClient | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [connected, setConnected] = useState(false);


  const initAndConnect = useCallback(async (serverAddress: string, id: string) => {
    try {
      // Create new client
      const newClient = new ConvoClient(id);
      setClient(newClient);
      
      // Try to load saved state
      const savedState = await loadManagerStateFromStorage();
      if (savedState) {
        console.log("Found saved manager state, loading...");
        await newClient.manager.loadState(savedState);
      }
      
      console.log("CLIENT INITIALIZED, connecting to: ", serverAddress);
      // Connect to server
      await newClient.connectToServer(serverAddress);
      setConnected(true);
      
      // Save the state after successful connection
      // if (!savedState) {
        const state = newClient.manager.saveState();
        await saveManagerStateToStorage(state);
      // }
      
      return newClient;
    } catch (error) {
      console.error("Error in initAndConnect:", error);
      throw error;
    }
  }, []);

  const createGroup = useCallback(async (name: string, userids: string[]) => {
    if (!client) throw new Error("Client not initialized");
    return await client.createGroupWithUsers(name, userids);
  }, [client]);

  const sendMessage = useCallback(async (groupId: ArrayBuffer, text: string) => {
    if (!client) throw new Error("Client not initialized");
    await client.sendMessage(groupId, text);
    // The message will be added to the group's messages via the client
  }, [client]);

  const getInvites = useCallback(async () => {
    if (!client) throw new Error("Client not initialized");
    const invites = await client.getPendingInvites();
    return invites;
  }, [client]);

  const acceptPendingInvite = useCallback(async (welcomeMessage: ArrayBuffer) => {
    if (!client) throw new Error("Client not initialized");
    try {
      await client.acceptPendingInvite(welcomeMessage);
    } catch (error) {
      console.error("Error accepting pending invite: ", error);
    }
  }, [client]);

  const rejectPendingInvite = useCallback(async (welcomeMessage: ArrayBuffer) => {
    if (!client) throw new Error("Client not initialized");
    await client.rejectPendingInvite(welcomeMessage);
  }, [client]);


  const getChats = useCallback(async () => {
    if (!client) throw new Error("Client not initialized");
    // list of all chats:
    return client.getChats();
  }, [client]);

  const getGroupChat = useCallback(async (groupId: string) => {
    if (!client) throw new Error("Client not initialized");
    // list of messages in a chat:
    return client.getGroupChat(groupId);

  }, [client]);

  // const saveManagerState = useCallback(async () => {
  //   if (!client) throw new Error("Client not initialized");
  //   return client.manager.saveState();
  // }, [client]);

  // const loadManagerState = useCallback(async (state: SerializedCredentialsWrapper) => {
  //   if (!client) throw new Error("Client not initialized");
  //   await client.manager.loadState(state);
  // }, [client]);

  const getGroupIdWithUsers = useCallback((userids: string[]) => {
    if (!client) throw new Error("Client not initialized");
    return client.manager.getGroupIdWithUsers(userids);
  }, [client]);

  const clearManagerState = useCallback(async () => {
    if (!client) throw new Error("Client not initialized");
    await client.clearState();
  }, [client]);

  // Computed property
  const isConnected = connected;

  const value = {
    client,
    groups,
    users,
    connected,
    isConnected,
    initAndConnect,
    // connect,
    createGroup,
    sendMessage,
    getInvites,
    acceptPendingInvite,
    rejectPendingInvite,
    getChats,
    getGroupChat,
    getGroupIdWithUsers,
    // saveManagerState,
    // loadManagerState,
    clearManagerState
  };

  return <ConvoContext.Provider value={value}>{children}</ConvoContext.Provider>;
}

// Custom hook to use the context
export function useConvo() {
  const context = useContext(ConvoContext);
  if (context === undefined) {
    throw new Error('useConvo must be used within a ConvoProvider');
  }
  return context;
} 