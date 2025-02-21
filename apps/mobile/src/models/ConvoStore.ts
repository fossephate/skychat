import { Instance, SnapshotOut, types } from "mobx-state-tree"
// import { ConvoClient } from "@/services/convo/ConvoClient"
import { withSetPropAction } from "./helpers/withSetPropAction"
// import { ConvoClient } from "../../../skychat-lib/src/client";
import { ConvoClient } from "@/utils/convo";


export const MessageModel = types.model("Message").props({
  text: types.string,
  senderId: types.string,
  timestamp: types.number,
})

export const GroupModel = types.model("Group").props({
  id: types.string,
  name: types.string,
  messages: types.array(MessageModel),
  globalIndex: types.number,
})

export const ConvoStoreModel = types
  .model("ConvoStore")
  .props({
    client: types.optional(types.frozen<any>(), null),
    groups: types.array(GroupModel),
    users: types.array(
      types.model({
        userId: types.string,
        name: types.string,
      }),
    ),
    connected: types.optional(types.boolean, false),
  })
  .actions(withSetPropAction)
  .actions((store) => ({
    initClient(id: string) {
      // check if a client with that id already exists in persistent storage, and if so, load it:
      // TODO: implement this
      store.client = new ConvoClient(id);
    },

    async connect(serverAddress: string) {
      if (!store.client) throw new Error("Client not initialized")
      await store.client.connectToServer(serverAddress)
      store.setProp("connected", true)
      
      // // Load initial users
      // const users = await store.client.listUsers()
      // store.setProp("users", users)
    },

    async createGroup(name: string) {
      if (!store.client) throw new Error("Client not initialized")
      await store.client.createGroup(name)
      // Refresh groups after creation
      // You'll need to implement a method to get all groups
    },

    async sendMessage(groupId: Uint8Array, text: string) {
      if (!store.client) throw new Error("Client not initialized")
      await store.client.sendMessage(groupId, text)
      // The message will be added to the group's messages via the client
    },

    async getGroups() {
      // return await store.client?.getGroups()
    }

    // Add more actions as needed
  }))
  .views((store) => ({
    get isConnected() {
      return store.connected
    },
  }))

export interface ConvoStore extends Instance<typeof ConvoStoreModel> {}
export interface ConvoStoreSnapshot extends SnapshotOut<typeof ConvoStoreModel> {} 