import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConvoClient } from "@/utils/convo";

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
  initClient: (id: string) => void;
  connect: (serverAddress: string) => Promise<void>;
  createGroup: (name: string, userids: string[]) => Promise<void>;
  sendMessage: (groupId: Uint8Array, text: string) => Promise<void>;
  getGroups: () => Promise<void>;
}

// Create the context with a default value
const ConvoContext = createContext<ConvoContextType | undefined>(undefined);

// Provider component
export function ConvoProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ConvoClient | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [connected, setConnected] = useState(false);

  const initClient = useCallback((id: string) => {
    // TODO: check if a client with that id already exists in persistent storage
    const newClient = new ConvoClient(id);
    setClient(newClient);
  }, []);

  const connect = useCallback(async (serverAddress: string) => {
    if (!client) throw new Error("Client not initialized");
    await client.connectToServer(serverAddress);
    setConnected(true);
    
    // Optionally load initial users
    // const users = await client.listUsers()
    // setUsers(users);
  }, [client]);

  const createGroup = useCallback(async (name: string, userids: string[]) => {
    if (!client) throw new Error("Client not initialized");
    await client.createGroup(name, userids);
    // Refresh groups after creation
    // TODO: Implement getGroups to refresh the list
  }, [client]);

  const sendMessage = useCallback(async (groupId: Uint8Array, text: string) => {
    if (!client) throw new Error("Client not initialized");
    await client.sendMessage(groupId, text);
    // The message will be added to the group's messages via the client
  }, [client]);

  const getGroups = useCallback(async () => {
    // TODO: Implement this
    // const fetchedGroups = await client?.getGroups();
    // if (fetchedGroups) setGroups(fetchedGroups);
  }, [client]);

  // Computed property
  const isConnected = connected;

  const value = {
    client,
    groups,
    users,
    connected,
    isConnected,
    initClient,
    connect,
    createGroup,
    sendMessage,
    getGroups,
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