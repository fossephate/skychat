import { ConvoUser, ConvoGroup, ConvoMessage, ConvoInvite } from '../types/conversation';

export class ConvoServer {
  private users: Map<string, ConvoUser> = new Map();
  private groups: Map<string, ConvoGroup> = new Map();
  private userSpecificMessages: Map<string, ConvoMessage[]> = new Map();

  constructor() { }

  private getGroupKey(groupId: Uint8Array): string {
    return Buffer.from(groupId).toString('base64');
  }

  public cleanupInactiveUsers() {
    const currentTime = Date.now() / 1000;
    const timeoutThreshold = 30; // 30 seconds timeout

    for (const [userId, user] of this.users.entries()) {
      if (currentTime - user.lastActive > timeoutThreshold) {
        this.users.delete(userId);
      }
    }
  }

  public clientConnect(userId: string, name: string, serializedKeyPackage: Uint8Array): void {
    const timestamp = Date.now() / 1000;

    this.users.set(userId, {
      userId,
      name,
      serializedKeyPackage,
      lastActive: timestamp
    });
  }

  public clientListUsers(): ConvoUser[] {
    return Array.from(this.users.values());
  }

  public clientCreateGroup(groupId: Uint8Array, groupName: string, senderId: string): void {
    const groupKey = this.getGroupKey(groupId);

    if (this.groups.has(groupKey)) {
      throw new Error('Group already exists');
    }

    const group: ConvoGroup = {
      groupId,
      groupName,
      globalIndex: 0,
      userIds: [senderId],
      messages: []
    };

    this.groups.set(groupKey, group);
  }

  public clientAcceptInvite(groupId: Uint8Array, senderId: string): void {
    const groupKey = this.getGroupKey(groupId);
    const group = this.groups.get(groupKey);

    if (!group) {
      throw new Error('Group not found');
    }

    group.userIds.push(senderId);
    this.userSpecificMessages.delete(senderId);
  }

  public clientGetGroupIndex(groupId: Uint8Array): number {
    const groupKey = this.getGroupKey(groupId);
    const group = this.groups.get(groupKey);

    if (!group) {
      throw new Error('Group not found');
    }

    return group.globalIndex;
  }

  public clientGetNewMessages(
    groupId: Uint8Array | null,
    senderId: string,
    index: number
  ): ConvoMessage[] {
    // Update last active timestamp
    const user = this.users.get(senderId);
    if (user) {
      user.lastActive = Date.now() / 1000;
    }

    let newMessages: ConvoMessage[] = [];

    // Get group messages if groupId provided
    if (groupId) {
      const groupKey = this.getGroupKey(groupId);
      const group = this.groups.get(groupKey);
      if (group) {
        newMessages = [...group.messages];
      }
    }

    // Filter messages by index
    newMessages = newMessages.filter(msg => msg.globalIndex > index);

    // Add user-specific messages
    const userMessages = this.userSpecificMessages.get(senderId);
    if (userMessages) {
      newMessages.push(...userMessages);
      this.userSpecificMessages.delete(senderId);
    }

    return newMessages;
  }

  public clientInviteUser(
    groupId: Uint8Array,
    senderId: string,
    receiverId: string,
    welcomeMessage: Uint8Array,
    ratchetTree: Uint8Array,
    fanned?: Uint8Array
  ): void {
    const groupKey = this.getGroupKey(groupId);
    const group = this.groups.get(groupKey);

    if (!group) {
      throw new Error('Group not found');
    }

    // Add fanned message if provided
    if (fanned) {
      group.messages.push({
        globalIndex: group.globalIndex + 1,
        senderId,
        message: fanned,
        unixTimestamp: Date.now() / 1000,
        invite: undefined
      });
      group.globalIndex++;
    }

    // Initialize user specific messages if needed
    if (!this.userSpecificMessages.has(receiverId)) {
      this.userSpecificMessages.set(receiverId, []);
    }

    // Add welcome message
    const userMessages = this.userSpecificMessages.get(receiverId)!;
    userMessages.push({
      globalIndex: group.globalIndex,
      senderId,
      unixTimestamp: Date.now() / 1000,
      invite: {
        groupName: group.groupName,
        welcomeMessage,
        ratchetTree,
        globalIndex: group.globalIndex,
        fanned: undefined
      }
    });

    group.globalIndex++;
  }

  public clientSendMessage(
    groupId: Uint8Array,
    senderId: string,
    message: Uint8Array,
    globalIndex: number
  ): void {
    const groupKey = this.getGroupKey(groupId);
    const group = this.groups.get(groupKey);

    if (!group) {
      throw new Error('Group not found');
    }

    const correctNewGi = group.globalIndex + 1;

    if (globalIndex === correctNewGi) {
      group.messages.push({
        globalIndex: correctNewGi,
        senderId,
        message,
        unixTimestamp: Date.now() / 1000
      });
      group.globalIndex = correctNewGi;
    } else if (globalIndex > correctNewGi) {
      throw new Error('Message is somehow too new!');
    } else {
      throw new Error('Message is too old! (need to sync first)');
    }
  }
} 