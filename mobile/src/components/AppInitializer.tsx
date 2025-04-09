import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { ReactNativeOAuthClient, TokenInvalidError, TokenRefreshError, TokenRevokedError } from "@aquareum/atproto-oauth-client-react-native";
import { useAuth } from '@/contexts/AuthContext';
import { useConvo } from 'skychat-lib';

// doesn't work in production for some reason??:
// import { AUTH_SERVER_URL, SKYCHAT_SERVER_URL } from "@/env";
const AUTH_SERVER_URL = "https://auth.fosse.co";
const SKYCHAT_SERVER_URL = "https://skychat.fosse.co";

export function AppInitializer(): JSX.Element {
  const authContext = useAuth();
  console.log("AAAAAAAAAAAAA");
  const convoContext = useConvo();
  console.log("BBBBBBBBBBBBB");
  useEffect(() => {
    const initializeApp = async () => {
      let authClient = new ReactNativeOAuthClient({
        clientMetadata: {
          "redirect_uris": [
            `${AUTH_SERVER_URL}/oauth/callback`
          ],
          "response_types": [
            "code"
          ],
          "grant_types": [
            "authorization_code",
            "refresh_token"
          ],
          "scope": "atproto transition:generic transition:chat.bsky",
          "token_endpoint_auth_method": "none",
          "application_type": "web",
          "client_id": `${AUTH_SERVER_URL}/client-metadata.json`,
          "client_name": "AT Protocol Express App",
          "client_uri": AUTH_SERVER_URL,
          "dpop_bound_access_tokens": true,
        },
        handleResolver: 'https://bsky.social'
      });

      console.log("initializing auth client");
      authContext.setClient(authClient);

      const result = await authClient.init();

      authClient.addEventListener(
        'deleted',
        (
          event: CustomEvent<{
            sub: string
            cause: TokenRefreshError | TokenRevokedError | TokenInvalidError | unknown
          }>,
        ) => {
          const { sub, cause } = event.detail;
          console.error(`Session for ${sub} is no longer available (cause: ${cause})`);
          authContext.setDidAuthenticate(false);
          router.replace("/welcome" as any);
        },
      );

      if (result) {
        const { session } = result;
        if ('state' in result && result.state != null) {
          console.log(
            `${session.sub} was successfully authenticated (state: ${result.state})`,
          );
        } else {
          console.log(`${session.sub} was restored (last active session)`);
        }
        authContext.setDidAuthenticate(true);
        authContext.setSession(session);

        let userId = session.sub;

        try {
          await convoContext.initAndConnect(SKYCHAT_SERVER_URL, userId);
        } catch (e) {
          console.error("Failed to initialize convo client", e);
          // TODO: handle this better: ¯\_(ツ)_/¯
          router.replace("/welcome" as any);
        }

        router.replace("/chats");
      } else {
        router.replace("/welcome" as any);
      }
    };

    initializeApp();
  }, []);

  return null;
} 