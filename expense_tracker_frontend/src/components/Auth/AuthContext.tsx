import React from 'react';
import {authData, AuthData} from "./AuthData";



const AuthContext = React.createContext<AuthData>(authData);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={authData}>{children}</AuthContext.Provider>;
}

export function useToken() {
  return React.useContext(AuthContext);
}