import React from "react";

import {AuthData, authData} from "./AuthData";

const AuthContext = React.createContext<AuthData>(authData);

export function AuthProvider({children}: {children: React.ReactNode}) {
  return (
    <AuthContext.Provider value={authData}>{children}</AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToken() {
  return React.useContext(AuthContext);
}
