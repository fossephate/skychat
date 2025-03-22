import { save, load, remove, clear } from "@/utils/storage";
import { SerializedCredentialsWrapper } from 'skychat-lib';

// Constants for storage keys
const MANAGER_STATE_KEY = 'convo_manager_state';

/**
 * Convert ArrayBuffer to Base64 string for storage
 */
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Convert Base64 string back to ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Serialize a Map to an object for storage
 */
const serializeMap = (map: Map<string, any>): Record<string, string> => {
  const obj: Record<string, string> = {};
  map.forEach((value, key) => {
    if (value instanceof ArrayBuffer) {
      obj[key] = arrayBufferToBase64(value);
    } else {
      obj[key] = JSON.stringify(value);
    }
  });
  return obj;
};

/**
 * Deserialize a Map from storage format
 */
const deserializeMap = (obj: Record<string, string>, arrayBufferValues: boolean = false): Map<string, any> => {
  const map = new Map<string, any>();
  Object.entries(obj).forEach(([key, value]) => {
    if (arrayBufferValues) {
      map.set(key, base64ToArrayBuffer(value));
    } else {
      try {
        map.set(key, JSON.parse(value));
      } catch {
        map.set(key, value);
      }
    }
  });
  return map;
};

/**
 * Prepare credentials wrapper for storage
 */
const prepareCredentialsForStorage = (wrapper: SerializedCredentialsWrapper): any => {
  return {
    signer: arrayBufferToBase64(wrapper.signer),
    storage: serializeMap(wrapper.storage),
    groupNames: wrapper.groupNames,
    groupNameToId: serializeMap(wrapper.groupNameToId),
    serializedCredentialWithKey: arrayBufferToBase64(wrapper.serializedCredentialWithKey)
  };
};

/**
 * Restore credentials wrapper from storage format
 */
const restoreCredentialsFromStorage = (data: any): SerializedCredentialsWrapper => {
  return {
    signer: base64ToArrayBuffer(data.signer),
    storage: deserializeMap(data.storage, true), // true means values are ArrayBuffers
    groupNames: data.groupNames,
    groupNameToId: deserializeMap(data.groupNameToId, true), // true means values are ArrayBuffers
    serializedCredentialWithKey: base64ToArrayBuffer(data.serializedCredentialWithKey)
  };
};

/**
 * Save manager state to storage
 */
export const saveManagerStateToStorage = async (state: SerializedCredentialsWrapper): Promise<boolean> => {
  try {
    const storableState = prepareCredentialsForStorage(state);
    return save(MANAGER_STATE_KEY, storableState);
  } catch (error) {
    console.error('Error saving manager state to storage:', error);
    return false;
  }
};

/**
 * Load manager state from storage
 */
export const loadManagerStateFromStorage = async (): Promise<SerializedCredentialsWrapper | null> => {
  try {
    const storableState = load<any>(MANAGER_STATE_KEY);
    if (!storableState) {
      console.log('No manager state found in storage');
      return null;
    }
    
    return restoreCredentialsFromStorage(storableState);
  } catch (error) {
    console.error('Error loading manager state from storage:', error);
    return null;
  }
};

/**
 * Clear manager state from storage
 */
export const clearManagerStateFromStorage = async (): Promise<void> => {
  // try {
  //   remove(MANAGER_STATE_KEY);
  //   console.log('Manager state cleared from storage');
  // } catch (error) {
  //   console.error('Error clearing manager state from storage:', error);
  // }
  // TODO: this is nuclear, we should only clear the manager state
  console.log('Clearing all storage!');
  clear()
};