// should handle all of the complexities of dealing with the skychat server and lib, handle saving and loading state, etc.

import { v4 as uuidv4 } from "uuid";
import { ConvoManager } from "skychat-lib";

// Type definitions
type GroupId = ArrayBuffer;
type SerializedMessage = ArrayBuffer;
type EncodedGroupId = string;

interface MessageItem {
  text: string;
  senderId: string;
  timestamp: number;
}

interface ConvoGroup {
  name: string;
  globalIndex: number;
  decrypted: MessageItem[];
}

interface ConvoUser {
  userId: string;
  name: string;
}

interface ConvoInvite {
  groupName: string;
  welcomeMessage: ArrayBuffer;
  ratchetTree: ArrayBuffer;
  fanned: ArrayBuffer;
}

interface ConvoMessage {
  senderId: string;
  message: SerializedMessage;
  globalIndex: number;
}

export class ConvoClient {
  public id: string;
  public manager: ConvoManager;
  public serverAddress: string | null;
  public idToName: Map<string, string>;

  constructor(id: string, state?: any) {
    this.id = id;
    this.manager = new ConvoManager(id);
    this.serverAddress = null;
    this.idToName = new Map();
    if (state) {
      this.manager.loadState(state);
    }
  }

  toB64(buffer: ArrayBuffer | undefined): string | undefined {
    if (!buffer) {
      return undefined;
    }
    return Buffer.from(buffer).toString("base64");
  }

  fromB64(b64: string): ArrayBuffer {
    // Create a buffer from the base64 string
    const buffer = Buffer.from(b64, "base64");
    // Get the underlying ArrayBuffer and create a new one to ensure it's only ArrayBuffer
    const arrayBuffer = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < buffer.length; i++) {
      view[i] = buffer[i];
    }
    return arrayBuffer;
  }

  async createGroup(groupName: string, userIds: string[]): Promise<EncodedGroupId> {
    console.log("convo.ts: createGroup()");
    if (!this.serverAddress) {
      throw new Error("Server address is not set");
    }

    const groupId = this.manager.createNewGroup(groupName);
    const encodedGroupId = this.toB64(groupId);

    const response = await fetch(`${this.serverAddress}/api/create_group`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        group_id: encodedGroupId,
        group_name: groupName,
        sender_id: this.id
      })
    });

    if (!response.ok) {
      console.error("Failed to create group", response);
      throw new Error("Failed to create group");
    }

    console.log("getting key packages for users: ", userIds);

    // get the serialized key packages for all of the users in the group:
    // map of userId to key package:
    const keyPackagesMap = await this.getUserKeyPackages(userIds);

    console.log("keyPackagesMap: ", keyPackagesMap);

    await this.manager.groupPushMessage(groupId, "<group_created>", this.id);

    // invite the users 1 by 1:
    for (const [userId, keyPackage] of keyPackagesMap.entries()) {
      await this.inviteUserToGroup(userId, groupId, keyPackage);
      let systemMessage = `<${userId}> joined the group`;
      await this.manager.groupPushMessage(groupId, systemMessage, this.id);
    }

    await this.manager.groupPushMessage(groupId, "<finished_creating_group>", this.id);

    return encodedGroupId;
  }

  async getUserKeyPackages(userIds: string[]): Promise<Map<string, ArrayBuffer>> {
    const response = await fetch(`${this.serverAddress}/api/get_user_keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_ids: userIds
      })
    });

    if (!response.ok) {
      // the user is not on skychat :(
      console.error("Failed to get key packages", response);
      throw new Error("failed_get_key_packages");
    }

    
    const responseData: any = await response.json();    
    // Convert the object to a Map
    let keyPackageMap = new Map<string, string>(Object.entries(responseData));
    if (keyPackageMap.size !== userIds.length) {
      throw new Error("failed_get_some_key_packages");
    }

    // convert the base64 strings to ArrayBuffers and map them to the userIds:
    let convertedKeyPackageMap = new Map<string, ArrayBuffer>();
    for (const [key, value] of keyPackageMap.entries()) {
      convertedKeyPackageMap.set(key, this.fromB64(value));
    }
    return convertedKeyPackageMap;
  }

  async connectToServer(address: string): Promise<void> {
    console.log("convo.ts: connectToServer()");
    this.serverAddress = address;

    const response = await fetch(`${address}/api/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: this.id,
        serialized_key_package: this.toB64(this.manager.getKeyPackage())
      })
    });

    // console.log("address: ", address);
    // console.log("serialized_key_package: ", this.manager.getKeyPackage());
    // console.log("response: ", response);
    // console.log("response.ok: ", response.ok);

    if (!response.ok) {
      // console.error("Failed to connect to server", response);
      throw new Error("Failed to connect to server");
    }

    // every 10 seconds, get any new messages and process them
    setInterval(() => {
      this.checkIncomingMessages();
    }, 10000);
  }

  // async listUsers(): Promise<ConvoUser[]> {
  //   if (!this.serverAddress) {
  //     throw new Error("Server address is not set");
  //   }
  //   const response = await fetch(`${this.serverAddress}/api/list_users`);
  //   const users: ConvoUser[] = await response.json();
  //   users.forEach(user => {
  //     this.idToName.set(user.userId, user.name);
  //   });
  //   this.idToName.set("system", "system");
  //   return users;
  // }

  async inviteUserToGroup(receiverId: string, groupId: GroupId, serializedKeyPackage: ArrayBuffer): Promise<void> {
    if (!this.serverAddress) {
      throw new Error("Server address is not set");
    }

    console.log(`inviting user to group: ${receiverId}, ${groupId.byteLength}, ${serializedKeyPackage.byteLength}`);

    const groupInvite = this.manager.createInvite(groupId, serializedKeyPackage);

    const response = await fetch(`${this.serverAddress}/api/invite_user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        group_id: this.toB64(groupId),
        sender_id: this.id,
        receiver_id: receiverId,
        welcome_message: this.toB64(groupInvite.welcomeMessage),
        ratchet_tree: this.toB64(groupInvite.ratchetTree),
        fanned: this.toB64(groupInvite.fanned)
      })
    });

    if (!response.ok) {
      throw new Error("Failed to send invite");
    }
  }

  async processInvite(invite: ConvoInvite): Promise<void> {
    // this.manager.processInvite(invite);
    // if (!this.serverAddress) {
    //   throw new Error("Server address is not set");
    // }
    // // const groupId = Array.from(this.findGroupIdByName(invite.groupName));
    // const groupId = invite.groupId;
    // const response = await fetch(`${this.serverAddress}/api/accept_invite`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     group_id: groupId,
    //     sender_id: this.id
    //   })
    // });
    // if (!response.ok) {
    //   throw new Error("Failed to accept invite");
    // }
  }

  // async acceptCurrentInvites(): Promise<void> {
  //   const invites = [...this.manager.pendingInvites];
  //   for (const invite of invites) {
  //     await this.processInvite(invite);
  //   }
  //   this.manager.pendingInvites = [];
  // }

  async checkIncomingMessages(groupId?: GroupId): Promise<ConvoMessage[]> {
    if (!this.serverAddress) {
      throw new Error("Server address is not set");
    }

    let index = 0;
    if (groupId) {
      index = await this.manager.groupGetIndex(groupId);
    }

    const response = await fetch(`${this.serverAddress}/api/get_new_messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        group_id: groupId,
        sender_id: this.id,
        index
        // TODO: this should need to be signed by the userid or some other auth
      })
    });

    const messages: ConvoMessage[] = await response.json();
    // filter out any messages from our own user_id:
    const filteredMessages = messages.filter(msg => msg.senderId !== this.id);

    this.manager.processConvoMessages(filteredMessages, groupId);
    return filteredMessages;
  }

  async getInvites(): Promise<ConvoInvite[]> {
    console.log("manager: ", this.manager);
    const invites = await this.manager.getPendingInvites();
    console.log("invites: ", this.manager.pendingInvites);
    return invites;
  }

  async syncGroup(groupId: GroupId): Promise<void> {
    await this.checkIncomingMessages(groupId);
    const groupIndex = await this.manager.groupGetIndex(groupId);

    this.manager.groupSetIndex(groupId, groupIndex);
  }

  async sendMessage(groupId: GroupId, text: string): Promise<void> {
    // always sync before sending a message:
    await this.syncGroup(groupId);

    const msg = this.manager.createMessage(groupId, text);
    // const group = this.manager.getGroup(groupId);
    const group = true;
    const groupIndex = await this.manager.groupGetIndex(groupId);

    if (!group || !this.serverAddress) {
      throw new Error("Group not found or server address not set");
    }

    const response = await fetch(`${this.serverAddress}/api/send_message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        group_id: groupId,
        sender_id: this.id,
        message: msg,
        global_index: groupIndex + 1
      })
    });

    if (response.ok) {
      await this.manager.groupSetIndex(groupId, groupIndex + 1);
      await this.manager.groupPushMessage(groupId, text, this.id);
    } else {
      await this.manager.groupPushMessage(groupId, "<message_failed to send!>", this.id);
    }
  }

  // getGroupMessages(groupId: GroupId): MessageItem[] {
  //   const group = this.manager.getGroup(groupId);
  //   if (!group) {
  //     throw new Error("Group not found");
  //   }
  //   return group.decrypted;
  // }

  // getRenderableMessages(groupId: GroupId): string[] {
  //   const messages = this.getGroupMessages(groupId);
  //   return messages.map(msg => {
  //     const senderName = this.idToName.get(msg.senderId) || msg.senderId;
  //     return `${senderName}: ${msg.text}`;
  //   });
  // }

  // private async getGroupIndex(groupId: GroupId): Promise<number> {
  //   if (!this.serverAddress) {
  //     throw new Error("Server address is not set");
  //   }

  //   const response = await fetch(`${this.serverAddress}/api/group_index`, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json'
  //     },
  //     body: JSON.stringify({
  //       group_id: Array.from(groupId),
  //       sender_id: this.userId
  //     })
  //   });

  //   return await response.json();
  // }

  // private findGroupIdByName(groupName: string): GroupId {
  //   // for (const [idHex, group] of this.manager.groups) {
  //   //   if (group.name === groupName) {
  //   //     return new Uint8Array(Buffer.from(idHex, 'hex'));
  //   //   }
  //   // }
  //   throw new Error("Group not found");
  // }

  // nameToId(userName: string): string {
  //   for (const [id, name] of this.idToName) {
  //     if (name === userName) {
  //       return id;
  //     }
  //   }
  //   throw new Error("User not found");
  // }
}
