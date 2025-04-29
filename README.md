# SkyChat

A secure chat application built with OpenMLS (Messaging Layer Security) providing end-to-end encryption.

___
<div style="display: flex; flex-direction: column; gap: 5px;">
   <div style="display: flex; flex-direction: row; gap: 10px;">
      <img src="/.screenshots/chats1.png" width="200">
      <img src="/.screenshots/chats2.png" width="200">
   </div>
   <div style="display: flex; flex-direction: row; gap: 10px;">
      <img src="/.screenshots/chatsettings.png" width="200">
      <img src="/.screenshots/chatrequests.png" width="200">
   </div>
   <div style="display: flex; flex-direction: row; gap: 10px;">
      <img src="/.screenshots/search1.png" width="200">
      <img src="/.screenshots/search2.png" width="200">
   </div>
      <div style="display: flex; flex-direction: row; gap: 10px;">
      <img src="/.screenshots/chat1.png" width="200">
      <img src="/.screenshots/chat2.png" width="200">
   </div>
</div>

___

## Overview

SkyChat is a cross-platform chat application that uses the OpenMLS protocol to provide secure, end-to-end encrypted group messaging. It's built with:

- Rust core for cryptography and security
- React Native for mobile clients
- UniFFI for native bindings
- OpenMLS for the messaging security protocol

## Features

- End-to-end encrypted group messaging
- Cross-platform support (iOS & Android)
- Secure key storage and management
- Modern cryptographic primitives via RustCrypto

## Project Structure

```
skychat/
├── core/               # Rust core library
│   ├── core/           # Core library / shared
│   ├── client/         # Client implementation
│   ├── server/         # Server implementation
│   └── examples/       # Examples
├── mobile/             # React Native mobile app
└── lib/                # React Native native module
```

## Development

```
pnpm install
./scripts/remake-lib.sh
```

___

## Usage examples
Most components require an atproto agent instance, which handles authentication and API interactions:
```
import { Agent } from "@atproto/api"
const agent = new Agent(session)
```

Before using any components, you must wrap your app in the ChatProvider component.
The ChatProvider has the following props
```tsx
stringsOverride?: an optional strings override (for translations)
lightThemeOverride?: an optional light theme override
darkThemeOverride?: an optional dark theme override
initialTheme?: 'light' | 'dark' | undefined (defaults to system theme)
```

```tsx
import { ChatProvider } from "skychat-lib"

function App() {

  const lightTheme: Theme = {
    colors: colorsLight,
    spacing: spacingLight,
    typography,
    timing,
    isDark: false,
  }

  // see source for type definitions here:
  const darkTheme: Theme = {
    colors: colorsDark,
    spacing: spacingDark,
    typography,
    timing,
    isDark: true,
  }

  const newS = (key: string) => {
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
      chatRequests: "Chat request",
    };
  
    try {
      return strings[key as keyof typeof strings];
    } catch (error) {
      console.error(`String key ${key} not found`);
      return "Error: String key not found";
    }
  };

  return (
    <ChatProvider
      stringsOverride={newS}
      initialTheme="dark"// 'light' | 'dark' | undefined;
      lightThemeOverride={lightTheme}
      darkThemeOverride={darkTheme}
    >
      <App />
    </ChatProvider>
  )
}
```

### ChatList Component
Displays a list of user chats
```tsx
import { ChatList } from "skychat-lib"
import { router } from "expo-router" // or your preferred navigation

function ChatsScreen() {
  return (
    <ChatList
      agent={agent}
      onChatPress={(chat) => {
        // Handle navigation to the selected chat
        if (chat.isBsky) {
          router.push(`/bskychats/${chat.id}`)
        } else {
          router.push(`/chats/${chat.id}`)
        }
      }}
      onInvitesPress={() => {
        // Navigate to invites screen
        router.push("/invites")
      }}
      onProfilePress={(id) => {
        // Navigate to profile screen
        router.push(`/profile/${id}`)
      }}
      refreshInterval={10000} // Refresh list every 10 seconds
    />
  )
}
```

### Chat Component
Renders an individual chat conversation with messages:
```tsx
import { Chat, useConvo } from "skychat-lib"

function ChatScreen({ route }) {
  const { chatId } = route.params
  
  return (
    <Chat
      agent={agent}
      chatId={chatId}
      onMessageSend={(text) => {
        // called when the user sends a message
        console.log(`Sending: ${text}`)
      }}
      onProfilePress={(did) => {
        // called when the user taps on the profile of another user
        router.push(`/profile/${did}`)
      }}
    />
  )
}
```

### SearchCreate Component
Allows users to search for other users and create new chats
```tsx
import { SearchCreate } from "skychat-lib"

function SearchScreen() {
  return (
    <SearchCreate 
      agent={agent}
      onChatPress={(did) => {
        // Handle starting a chat with user
        console.log(`Starting chat with: ${did}`)
      }}
      onProfilePress={(did) => {
        router.push(`/profile/${did}`)
      }}
    />
  )
}
```

### ChatRequestsList Component
Displays incoming chat requests/invites
```tsx
import { ChatRequestsList } from "skychat-lib"

function InvitesScreen() {
  return (
    <ChatRequestsList
      agent={agent}
      onChatPress={(chat) => {
        if (chat.isBsky) {
          router.push(`/bskychats/${chat.id}`)
        } else {
          router.push(`/chats/${chat.id}`)
        }
      }}
      onProfilePress={(id) => {
        // Navigate to profile
        router.push(`/profile/${id}`)
      }}
    />
  )
}
```


### ChatSettings Component
Displays chat preferences and settings
```tsx
import { ChatSettings } from "skychat-lib"

function ChatSettingsScreen() {
  return <ChatSettings agent={agent} />
}
```