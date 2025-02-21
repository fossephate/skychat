const en = {
  common: {
    ok: "OK!",
    cancel: "Cancel",
    back: "Back",
    logOut: "Log Out",
  },
  navigator: {
    contactsTab: "Contacts",
    chatsTab: "Chats",
    settingsTab: "Settings",
  },
  contactsScreen: {
    title: "Contacts",
    searchPlaceholder: "Search contacts...",
  },
  welcomeScreen: {
    readyForLaunch: "Welcome to SkyChat!",
    postscript: "Message your friends online securely using MLS!",
    exciting: "(ohh, this is exciting!)",
    letsGo: "Let's go!",
  },
  errorScreen: {
    title: "Something went wrong!",
    friendlySubtitle:
      "This is the screen that your users will see in production when an error is thrown. You'll want to customize this message (located in `app/i18n/en.ts`) and probably the layout as well (`app/screens/ErrorScreen`). If you want to remove this entirely, check `app/app.tsx` for the <ErrorBoundary> component.",
    reset: "RESET APP",
    traceTitle: "Error from %{name} stack",
  },
  emptyStateComponent: {
    generic: {
      heading: "So empty... so sad",
      content: "No data found yet. Try clicking the button to refresh or reload the app.",
      button: "Let's try this again",
    },
  },

  errors: {
    invalidEmail: "Invalid email address.",
  },
  loginScreen: {
    logIn: "Log In",
    enterDetails:
      "Enter your handle to log in with Bluesky.",
    emailFieldLabel: "Email",
    passwordFieldLabel: "Password",
    emailFieldPlaceholder: "Enter your email address",
    passwordFieldPlaceholder: "Super secret password here",
    tapToLogIn: "Tap to log in!",
    hint: "Hint: you can use any email address and your favorite password :)",
    handleNotFound: "Handle not found",
    usernameFieldLabel: "Handle",
    usernameFieldPlaceholder: "Enter your handle (e.g. alice.bsky.social)",
    loginButton: "Log In",
  },
  chatScreen: {
    title: "Chat with {{name}}",
    inputPlaceholder: "Type a message...",
    send: "Send",
  },
  settingsScreen: {
    account: "Account",
    privacy: "Privacy",
    security: "Security",
    connectedAccounts: "Connected Accounts",
    preferences: "Preferences",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    autoplayMedia: "Autoplay Media",
    language: "Language",
    storageAndData: "Storage and Data",
    dataUsage: "Data Usage",
    storage: "Storage",
    support: "Support",
    helpCenter: "Help Center",
    reportProblem: "Report a Problem",
    termsOfService: "Terms of Service",
    editProfile: "Edit Profile",
  },
  newChat: {
    title: "New Chat",
    searchPlaceholder: "Search users...",
    following: "Following",
    global: "Global",
    createGroupButton: "Create Group",
    groupNamePlaceholder: "Enter a name for your group",
  },
  chatlistScreen: {
    title: "Chats",
  },
}

export default en
export type Translations = typeof en
