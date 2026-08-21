"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

const UNIVERSITY_USERS = [
  {
    username: "admin@stanford.edu",
    password: "password123",
    role: "university",
    name: "Registrar Office",
    institution: "Stanford Institute of Technology",
  },
  {
    username: "admin@mit.edu",
    password: "password123",
    role: "university",
    name: "Office of Academic Records",
    institution: "Massachusetts Academy of Science",
  },
  {
    username: "admin@university.edu",
    password: "password123",
    role: "university",
    name: "Registrar Office",
    institution: "Solana Technical University",
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
        console.error("Failed to parse stored auth", e);
      }
    }
    setLoading(false);
  }, []);

  const getStudentAccounts = () => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("trustanchor_student_accounts");
    return raw ? JSON.parse(raw) : [];
  };

  const registerStudentAccount = (studentData) => {
    const accounts = getStudentAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.username.toLowerCase() === studentData.username.toLowerCase().trim()
    );

    if (existingIndex > -1) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...studentData };
    } else {
      accounts.push(studentData);
    }
    localStorage.setItem("trustanchor_student_accounts", JSON.stringify(accounts));
  };

  const login = (username, password, selectedRole) => {
    const cleanUser = username.toLowerCase().trim();

    if (selectedRole === "university") {
      const foundUniv = UNIVERSITY_USERS.find(
        (u) => u.username.toLowerCase() === cleanUser && u.password === password
      );

      if (foundUniv) {
        setUser(foundUniv);
        localStorage.setItem("trustanchor_auth_user", JSON.stringify(foundUniv));
        router.push("/issuer");
        return { success: true };
      }

      // Default fallback for any university email
      if (cleanUser.includes("@")) {
        const dynamicUnivName = cleanUser
          .split("@")[1]
          .split(".")[0]
          .toUpperCase() + " UNIVERSITY";

        const dynamicUniv = {
          username: cleanUser,
          password,
          role: "university",
          name: "Registrar Office",
          institution: dynamicUnivName,
        };
        setUser(dynamicUniv);
        localStorage.setItem("trustanchor_auth_user", JSON.stringify(dynamicUniv));
        router.push("/issuer");
        return { success: true };
      }

      return { success: false, error: "Invalid university credentials" };
    }

    if (selectedRole === "student") {
      const studentAccounts = getStudentAccounts();
      const foundStudent = studentAccounts.find(
        (acc) => acc.username.toLowerCase() === cleanUser && acc.password === password
      );

      if (foundStudent) {
        setUser(foundStudent);
        localStorage.setItem("trustanchor_auth_user", JSON.stringify(foundStudent));
        router.push("/student");
        return { success: true };
      }
      return {
        success: false,
        error: "No student account found with these credentials. Please contact your issuer.",
      };
    }

    return { success: false, error: "Invalid role selected" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("trustanchor_auth_user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, registerStudentAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);