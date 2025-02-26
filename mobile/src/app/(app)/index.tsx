import { router, useLocalSearchParams } from "expo-router";
import { observer } from "mobx-react-lite"
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function LoadingScreen() {
  const authContext = useAuth();
  const params = useLocalSearchParams();


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
        router.replace("/chats")
        return;
      }
      // setTimeout(() => {
      //   if (!client && !authContext.session) {
      //     router.replace("/welcome")
      //   } else {
      //     router.replace("/chats")
      //   }
      // }, 3000)

      // console.log("test", client, authContext.session);
      // if (authContext.session) {
        setTimeout(() => {
          router.replace("/chats")
        }, 3000)
      // }
    })()
    // force login for testing:
    // setTimeout(() => {
    //   router.replace("/chats")
    // }, 3000)
  }, [authContext.client])



  return null;
}