// import { Instance, SnapshotOut, types } from "mobx-state-tree"
// import { OAuthSession, ReactNativeOAuthClient } from "@aquareum/atproto-oauth-client-react-native"

// let authClient: ReactNativeOAuthClient | null = null

// export const AuthenticationStoreModel = types
//   .model("AuthenticationStore")
//   .props({
//     authToken: types.maybe(types.string),
//     authEmail: "",
//     didAuthenticate: types.optional(types.boolean, false),
//     session: types.maybe(types.frozen<OAuthSession>()),
//   })
//   .views((store) => ({
//     get isAuthenticated() {
//       return store.didAuthenticate
//     },
//     get client() {
//       return authClient
//     },
//     get validationError() {
//       if (store.authEmail.length === 0) return "can't be blank"
//       if (store.authEmail.length < 6) return "must be at least 6 characters"
//       if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(store.authEmail))
//         return "must be a valid email address"
//       return ""
//     },
//   }))
//   .actions((store) => ({
//     setAuthToken(value?: string) {
//       store.authToken = value
//     },
//     setAuthEmail(value: string) {
//       store.authEmail = value.replace(/ /g, "")
//     },
//     setDidAuthenticate(value: boolean) {
//       store.didAuthenticate = value
//     },
//     setClient(client: ReactNativeOAuthClient) {
//       authClient = client
//     },
//     logout() {
//       store.authToken = undefined
//       store.authEmail = ""
//       store.didAuthenticate = false
//       authClient = null
//     },
//     setSession(session: OAuthSession) {
//       store.session = session
//     },
//   }))

// export interface AuthenticationStore extends Instance<typeof AuthenticationStoreModel> {}
// export interface AuthenticationStoreSnapshot extends SnapshotOut<typeof AuthenticationStoreModel> {}
