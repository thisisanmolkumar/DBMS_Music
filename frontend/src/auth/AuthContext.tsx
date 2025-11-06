import { createContext, useContext, useState, ReactNode } from "react";
import { API_BASE_URL } from "../config/api";

type User = { id: string; email: string; username: string } | null;

type LoginResponse =
    | { ok: true }
    | { ok: false; error: string };

type AuthContextValue = {
    user: User;
    login: (email: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>(null);

    const login = async (
        email: string,
        password: string
    ): Promise<LoginResponse> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data: {
                user?: {
                    _id?: string;
                    id?: string;
                    email: string;
                    username?: string;
                };
                error?: string;
            } | null = await response.json().catch(() => null);

            if (!response.ok) {
                return {
                    ok: false,
                    error:
                        data?.error ??
                        "Invalid email or password. Please try again.",
                };
            }

            if (!data?.user) {
                return {
                    ok: false,
                    error: "Login succeeded but the user payload was missing.",
                };
            }

            const userPayload = data.user;
            const userId = userPayload._id ?? (userPayload as { id?: string }).id;
            if (!userId) {
                return {
                    ok: false,
                    error: "Login response was missing the user identifier.",
                };
            }

            setUser({
                id: userId,
                email: userPayload.email,
                username: userPayload.username ?? userPayload.email,
            });

            return { ok: true };
        } catch (error) {
            console.error("Login failed", error);
            return {
                ok: false,
                error: "Unable to reach the server. Please try again later.",
            };
        }
    };

    const logout = () => setUser(null);

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
};
