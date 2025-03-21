import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConvoClient } from "@/utils/convo";
// import { ConvoClient } from "skychat-lib";

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
  sendMessage: (groupId: Uint8Array, text: string) => Promise<void>;
  getGroups: () => Promise<void>;
  acceptPendingInvite: (welcomeMessage: ArrayBuffer) => Promise<ArrayBuffer>;
  rejectPendingInvite: (welcomeMessage: ArrayBuffer) => Promise<void>;
}

// Create the context with a default value
const ConvoContext = createContext<ConvoContextType | undefined>(undefined);

// Provider component
export function ConvoProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConvoClient | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [connected, setConnected] = useState(false);

  // const initClient = useCallback((id: string) => {
  //   // TODO: check if a client with that id already exists in persistent storage
  //   const newClient = new ConvoClient(id);
  //   setClient(newClient);
  //   return newClient; // Return the client instance directly
  // }, []);

  // const connect = useCallback(async (serverAddress: string) => {
  //   console.log("connecting to server...", serverAddress, client);
  //   if (!client) throw new Error("Client not initialized");
  //   await client.connectToServer(serverAddress);
  //   setConnected(true);
    
  //   // Optionally load initial users
  //   // const users = await client.listUsers()
  //   // setUsers(users);
  // }, [client]);


  const initAndConnect = useCallback(async (serverAddress: string, id: string) => {
    const newClient = new ConvoClient(id);
    setClient(newClient);
    console.log("CLIENT INITIALIZED, connecting to: ", serverAddress);
    // await newClient.connectToServer(serverAddress);
    await newClient.connectToServer(serverAddress);
    setConnected(true);
  }, [client]);

  const createGroup = useCallback(async (name: string, userids: string[]) => {
    if (!client) throw new Error("Client not initialized");
    await client.createGroupWithUsers(name, userids);
  }, [client]);

  const sendMessage = useCallback(async (groupId: ArrayBuffer, text: string) => {
    if (!client) throw new Error("Client not initialized");
    await client.sendMessage(groupId, text);
    // The message will be added to the group's messages via the client
  }, [client]);

  const getGroups = useCallback(async () => {
    // TODO: Implement this
    // const fetchedGroups = await client?.getGroups();
    // if (fetchedGroups) setGroups(fetchedGroups);
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
    return await client.getChats();
  }, [client]);

  const getChatMessages = useCallback(async (groupId: string) => {
    if (!client) throw new Error("Client not initialized");
    // list of messages in a chat:



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
    getGroups,
    getInvites,
    acceptPendingInvite,
    rejectPendingInvite,
    getChats,
    getChatMessages
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