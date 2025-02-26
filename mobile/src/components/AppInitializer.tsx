import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { ReactNativeOAuthClient, TokenInvalidError, TokenRefreshError, TokenRevokedError } from "@aquareum/atproto-oauth-client-react-native";
import { AUTH_SERVER_URL, SKYCHAT_SERVER_URL } from "@/env";
import { useAuth } from '@/contexts/AuthContext';
import { useConvo } from '@/contexts/ConvoContext';

export function AppInitializer() {
  const auth = useAuth();
  const convo = useConvo();

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

      console.log("initializing client");
      auth.setClient(authClient);

      const result = await authClient.init();
      console.log("client init results:", result);

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
          auth.setDidAuthenticate(false);
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
        auth.setDidAuthenticate(true);
        auth.setSession(session);

        let userId = session.sub;

        // initialize the convo client
        console.log("initializing convo client");
        try {
          convo.initClient(userId);
          await convo.connect(SKYCHAT_SERVER_URL);
        } catch (e) {
          // console.error("Failed to connect to convo server", e);
        }
        
        if (convo.isConnected) {
          console.log("AppInitializer: convo connected!");
          router.replace("/chats");
        } else {
          console.log("AppInitializer: convo not connected");
          // TODO: handle this better: ¯\_(ツ)_/¯
          router.replace("/welcome" as any);
        }
      } else {
        router.replace("/welcome" as any);
      }
    };

    initializeApp();
  }, []);

  return null;
} 