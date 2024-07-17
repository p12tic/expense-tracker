import React from 'react';
import {authData, AuthData} from "./AuthData.tsx";



const AuthContext = React.createContext<AuthData>(authData);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={AuthData}>{children}</AuthContext.Provider>;
}

export function useStore() {
  return React.useContext(AuthContext);
}