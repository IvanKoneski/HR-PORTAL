import { createContext, useContext, useState, ReactNode } from "react";
import api, { setSessionHeaders } from "../api/client";
import type { Session } from "../api/client"; // <-- type-only import

type AuthCtx = {
  session: Session | null;
  login: (username: string, password: string) => Promise<Session>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>(null!);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);

  const login = async (username: string, password: string) => {
    const { data } = await api.post<Session>("/api/auth/login", { username, password });
    setSession(data);
    setSessionHeaders(data);
    return data;
  };

  const logout = () => {
    setSession(null);
    setSessionHeaders(undefined);
  };

  return <Ctx.Provider value={{ session, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);