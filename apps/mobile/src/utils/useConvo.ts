import { useCallback } from "react"
import { useStores } from "@/models"

export function useConvo() {
  const { convoStore } = useStores()

  const initializeConvo = useCallback(async (name: string, serverAddress: string) => {
    convoStore.initClient(name)
    await convoStore.connect(serverAddress)
  }, [convoStore])

  const sendMessage = useCallback(async (groupId: string, text: string) => {
    // convert groupId to Uint8Array
    const groupIdAsUint8Array = new TextEncoder().encode(groupId)
    await convoStore.sendMessage(groupIdAsUint8Array, text)
  }, [convoStore])

  const createGroup = useCallback(async (name: string) => {
    await convoStore.createGroup(name)
  }, [convoStore])

  return {
    isConnected: convoStore.isConnected,
    users: convoStore.users,
    groups: convoStore.groups,
    initializeConvo,
    sendMessage,
    createGroup,
  }
} 