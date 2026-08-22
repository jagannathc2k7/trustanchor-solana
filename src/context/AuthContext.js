"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllCertificates } from "../lib/certificateStore";

const AuthContext = createContext();

export const BASE_PRESET_USERS = [
  {
    role: "university",
    username: "issuer@vit.ac.in",
    password: "password123",
    name: "Dr. K. Ramanathan",
    institution: "VIT Chennai",
  },
  {
    role: "company",
    username: "verifier@techcorp.com",
    password: "password123",
    name: "Sarah Jenkins",
    company: "TechCorp Global Talent",
  },
  {
    role: "admin",
    username: "admin@trustanchor.dev",
    password: "password123",
    name: "Registry Admin",
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [matrixUsers, setMatrixUsers] = useState(BASE_PRESET_USERS);

  const loadMatrixUsers = async () => {
    try {
      const allCerts = await fetchAllCertificates();
      
      // Extract all unique student records issued in the database
      const dynamicStudents = [];
      const seenEmails = new Set();

      allCerts.forEach((cert) => {
        const email = cert.studentEmail?.toLowerCase();
        if (email && !seenEmails.has(email)) {
          seenEmails.add(email);
          dynamicStudents.push({
            role: "student",
            username: cert.studentEmail,
            password: "password123",
            name: cert.studentName,
            studentId: cert.studentId,
            institution: cert.institution,
            degree: cert.degree || cert.docType,
            cgpa: cert.cgpa,
            status: cert.status,
          });
        }
      });

      // Default demo student if no database rows exist yet
      if (dynamicStudents.length === 0) {
        dynamicStudents.push({
          role: "student",
          username: "alex.morgan@student.edu",
          password: "password123",
          name: "Alex Morgan",
          studentId: "CS-2026-8841",
          institution: "VIT Chennai",
        });
      }

      setMatrixUsers([...dynamicStudents, ...BASE_PRESET_USERS]);
    } catch {
      setMatrixUsers(BASE_PRESET_USERS);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("trustanchor_auth_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    loadMatrixUsers();
    setLoading(false);
  }, []);

  const login = (username, password, role) => {
    const cleanUser = username?.trim().toLowerCase();
    
    // Find matching user from dynamic list
    const found = matrixUsers.find(
      (u) => u.username.toLowerCase() === cleanUser
    );

    let loggedInProfile;
    if (found) {
      loggedInProfile = { ...found };
    } else {
      loggedInProfile = {
        role: role || "student",
        username: username,
        name: username.split("@")[0],
      };
    }

    setUser(loggedInProfile);
    localStorage.setItem("trustanchor_auth_user", JSON.stringify(loggedInProfile));
    return { success: true, user: loggedInProfile };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("trustanchor_auth_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        matrixUsers,
        refreshMatrix: loadMatrixUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);