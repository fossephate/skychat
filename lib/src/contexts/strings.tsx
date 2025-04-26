// import React, { createContext, useContext, ReactNode } from 'react';

// // Define the original string function type
// export type StringFunction = (key: string) => string;

// // Define the default string function
// export const defaultS = (key: string) => {
//   const strings = {
//     clearSelection: "Clear",
//     accept: "Accept",
//     reject: "Reject",
//     cancel: "Cancel",
//     leave: "Leave",
//     leaveChat: "Leave Conversation",
//     leaveChatConfirmation1: "Are you sure you want to leave this conversation?",
//     leaveChatConfirmation2: "Your messages will be deleted for you, but not for the other participants.",
//     bskyDmHeader: "Bluesky DMs",
//     skyDmHeader: "Skychats",
//     newDm: "New DM",
//     newChat: "New Group",
//     chatRequests: "Chat requests",
//     chatRequestsEmpty: "No chat requests",
//   };

//   try {
//     return strings[key as keyof typeof strings];
//   } catch (error) {
//     console.error(`String key ${key} not found`);
//     return "Error: String key not found";
//   }
// };

// // Create a context for the string function
// const StringContext = createContext<StringFunction>(defaultS);

// // Props for the StringProvider component
// interface StringProviderProps {
//   children: ReactNode;
//   overrideS?: (originalS: StringFunction) => StringFunction;
// }

// // Create the provider component
// export const StringProvider: React.FC<StringProviderProps> = ({ children, overrideS }) => {
//   // If an override function is provided, use it to wrap the default function
//   const stringFunction = overrideS ? overrideS(defaultS) : defaultS;

//   return (
//     <StringContext.Provider value={stringFunction}>
//       {children}
//     </StringContext.Provider>
//   );
// };

// // Create a hook to use the string function
// export const useStrings = (): StringFunction => {
//   const s = useContext(StringContext);
//   if (!s) {
//     throw new Error('useStrings must be used within a StringProvider');
//   }
//   return s;
// };



import React, { createContext, useContext, ReactNode, useEffect } from 'react';

// Define the original string function type
export type StringFunction = (key: string) => string;


// Define the default string function
export const defaultS = (key: string) => {
  const strings = {
    clearSelection: "Clear",
    accept: "Accept",
    reject: "Reject",
    cancel: "Cancel",
    leave: "Leave",
    leaveChat: "Leave Conversation",
    leaveChatConfirmation1: "Are you sure you want to leave this conversation?",
    leaveChatConfirmation2: "Your messages will be deleted for you, but not for the other participants.",
    bskyDmHeader: "Bluesky DMs",
    skyDmHeader: "Skychats",
    newDm: "New DM",
    newChat: "New Group",
    chatRequests: "Chat requests",
    chatRequestsEmpty: "No chat requests",
  };
  return strings[key as keyof typeof strings] ?? "Error: String key not found";
};

// Create a global instance for action sheets
// This is critical for components rendered outside the React tree
let globalStringsInstance = {
  s: defaultS
};

// Create a context for the string function
const StringContext = createContext<StringFunction | null>(null);

// Props for the StringProvider component
interface StringProviderProps {
  children: ReactNode;
  overrideS?: (originalS: StringFunction) => StringFunction;
}

// Create the provider component
export const StringProvider: React.FC<StringProviderProps> = ({ children, overrideS }) => {
  // If an override function is provided, use it to wrap the default function
  const stringFunction = overrideS ? overrideS(defaultS) : defaultS;

  // Update the global instance when the provider mounts or the function changes
  useEffect(() => {
    globalStringsInstance.s = stringFunction;

    // Clean up when unmounting
    return () => {
      globalStringsInstance.s = defaultS;
    };
  }, [stringFunction]);

  return (
    <StringContext.Provider value={stringFunction}>
      {children}
    </StringContext.Provider>
  );
};

// Create a hook to use the string function within React components
export const useStrings = (): StringFunction => {
  const contextValue = useContext(StringContext);
  if (!contextValue) {
    // Fallback to the global instance if context is not available
    return globalStringsInstance.s;
  }
  return contextValue;
};

// Export the global instance getter for use in action sheets or other non-React contexts
export const getStrings = (): StringFunction => {
  return globalStringsInstance.s;
};