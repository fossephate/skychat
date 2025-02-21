export interface ConvoUser {
  name: string;
  userId: string;
  serializedKeyPackage: Uint8Array;
  lastActive: number;
}

export interface MessageItem {
  text: string;
  senderId: string;
  timestamp: number;
}

export interface ConvoInvite {
  groupName: string;
  welcomeMessage: Uint8Array;
  ratchetTree?: Uint8Array;
  globalIndex: number;
  fanned?: Uint8Array;
}

export interface ConvoMessage {
  globalIndex: number;
  senderId: string;
  unixTimestamp: number;
  message?: Uint8Array;
  invite?: ConvoInvite;
}

export interface ConvoGroup {
  groupId: Uint8Array;
  groupName: string;
  globalIndex: number;
  userIds: string[];
  messages: ConvoMessage[];
} 