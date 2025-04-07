import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { OAuthSession, ReactNativeOAuthClient } from "@aquareum/atproto-oauth-client-react-native";

interface AuthContextType {
  authToken?: string;
  authEmail: string;
  didAuthenticate: boolean;
  session?: OAuthSession;
  client: ReactNativeOAuthClient | null;
  isAuthenticated: boolean;
  validationError: string;
  setAuthToken: (value?: string) => void;
  setAuthEmail: (value: string) => void;
  setDidAuthenticate: (value: boolean) => void;
  setClient: (client: ReactNativeOAuthClient) => void;
  logout: () => void;
  setSession: (session: OAuthSession) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authToken, setAuthTokenState] = useState<string | undefined>(undefined);
  const [authEmail, setAuthEmailState] = useState("");
  const [didAuthenticate, setDidAuthenticateState] = useState(false);
  const [session, setSessionState] = useState<OAuthSession | undefined>(undefined);
  const [client, setClientState] = useState<ReactNativeOAuthClient | null>(null);

  const setAuthToken = useCallback((value?: string) => {
    setAuthTokenState(value);
  }, []);

  const setAuthEmail = useCallback((value: string) => {
    setAuthEmailState(value.replace(/ /g, ""));
  }, []);

  const setDidAuthenticate = useCallback((value: boolean) => {
    setDidAuthenticateState(value);
  }, []);

  const setClient = useCallback((newClient: ReactNativeOAuthClient) => {
    setClientState(newClient);
  }, []);

  const logout = useCallback(() => {
    setAuthTokenState(undefined);
    setAuthEmailState("");
    setDidAuthenticateState(false);
    setClientState(null);
  }, []);

  const setSession = useCallback((newSession: OAuthSession) => {
    setSessionState(newSession);
  }, []);

  // Computed properties
  const isAuthenticated = didAuthenticate;
  
  const validationError = (() => {
    if (authEmail.length === 0) return "can't be blank";
    if (authEmail.length < 6) return "must be at least 6 characters";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail))
      return "must be a valid email address";
    return "";
  })();

  const value = {
    authToken,
    authEmail,
    didAuthenticate,
    session,
    client,
    isAuthenticated,
    validationError,
    setAuthToken,
    setAuthEmail,
    setDidAuthenticate,
    setClient,
    logout,
    setSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 