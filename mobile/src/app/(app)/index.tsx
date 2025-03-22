import { router, useLocalSearchParams } from "expo-router";
import { observer } from "mobx-react-lite"
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useConvo } from "@/contexts/ConvoContext";

export default function LoadingScreen() {
  const authContext = useAuth();
  const params = useLocalSearchParams();

  const convoContext = useConvo();

  // TODO: move this to env:
  const SKYCHAT_SERVER_URL = "https://skychat.fosse.co";


  useEffect(() => {
    (async () => {
      const client = authContext.client;
      if (params.code && params.state && params.iss && client) {
        let urlParams = new URLSearchParams();
        urlParams.set("code", params.code as string)
        urlParams.set("state", params.state as string)
        urlParams.set("iss", params.iss as string)
        const { session, state } = await client.callback(urlParams)
        console.log(`logged in as ${session.sub}!`)
        authContext.setSession(session)


        // TODO: this is some duplicated code from the AppInitializer:
        // router.replace("/chats")
        authContext.setDidAuthenticate(true);
        let userId = session.sub;

        try {
          await convoContext.initAndConnect(SKYCHAT_SERVER_URL, userId);
        } catch (e) {
          console.error("Failed to initialize convo client", e);
          // TODO: handle this better: ¯\_(ツ)_/¯
          router.replace("/welcome" as any);
        }
        return;
      }
    })()
    // force login for testing:
    // setTimeout(() => {
    //   router.replace("/chats")
    // }, 3000)
  }, [authContext.client])



  return null;
}