"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

const PRESET_USERS = [
  {
    username: "student@vit.ac.in",
    password: "password123",
    role: "student",
    name: "Arjun Krishnamurthy",
    studentId: "25BLC1371",
  },
  {
    username: "issuer@vit.ac.in",
    password: "password123",
    role: "university",
    name: "Dr. Priya Sharma",
    institution: "VIT Chennai",
  },
  {
    username: "verifier@techcorp.com",
    password: "password123",
    role: "company",
    name: "XYZ Technologies Recruiter",
    company: "XYZ Technologies India",
  },
  {
    username: "admin@trustanchor.dev",
    password: "password123",
    role: "admin",
    name: "System Platform Admin",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("trustanchor_auth_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
    setLoading(false);
  }, []);

  const login = (username, password, role) => {
    const cleanUser = username.toLowerCase().trim();
    const found = PRESET_USERS.find((u) => u.username.toLowerCase() === cleanUser && u.password === password);

    if (found) {
      setUser(found);
      localStorage.setItem("trustanchor_auth_user", JSON.stringify(found));
      redirectByRole(found.role);
      return { success: true };
    }

    // Dynamic sign-in fallback
    const dynamicUser = {
      username: cleanUser,
      password,
      role: role || "student",
      name: cleanUser.split("@")[0].toUpperCase(),
      institution: cleanUser.includes("@") ? cleanUser.split("@")[1].split(".")[0].toUpperCase() + " UNIV" : "INSTITUTION",
    };
    setUser(dynamicUser);
    localStorage.setItem("trustanchor_auth_user", JSON.stringify(dynamicUser));
    redirectByRole(dynamicUser.role);
    return { success: true };
  };

  const redirectByRole = (role) => {
    if (role === "university") router.push("/issuer");
    else if (role === "student") router.push("/student");
    else if (role === "company") router.push("/company");
    else if (role === "admin") router.push("/admin");
    else router.push("/");
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("trustanchor_auth_user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, PRESET_USERS }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);