"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllCertificates } from "../lib/certificateStore";

const AuthContext = createContext();

export const DEFAULT_DEV_PRESETS = [
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
  const [deviceHistory, setDeviceHistory] = useState([]);
  const [allDbUsers, setAllDbUsers] = useState([]);
  const [isDevMode, setIsDevMode] = useState(false);

  const loadDeviceHistory = () => {
    if (typeof window === "undefined") return;
    const history = localStorage.getItem("trustanchor_device_account_history");
    try {
      setDeviceHistory(history ? JSON.parse(history) : []);
    } catch {
      setDeviceHistory([]);
    }

    const devFlag = localStorage.getItem("trustanchor_is_dev_device");
    setIsDevMode(devFlag === "true");
  };

  const loadAllGlobalUsers = async () => {
    try {
      const allCerts = await fetchAllCertificates();
      const dynamicStudents = [];
      const seen = new Set();

      allCerts.forEach((cert) => {
        const email = cert.studentEmail?.toLowerCase();
        if (email && !seen.has(email)) {
          seen.add(email);
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

      setAllDbUsers([...dynamicStudents, ...DEFAULT_DEV_PRESETS]);
    } catch {
      setAllDbUsers(DEFAULT_DEV_PRESETS);
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
    loadDeviceHistory();
    loadAllGlobalUsers();
    setLoading(false);
  }, []);

  const toggleDevDevice = (enable) => {
    setIsDevMode(enable);
    if (enable) {
      localStorage.setItem("trustanchor_is_dev_device", "true");
    } else {
      localStorage.removeItem("trustanchor_is_dev_device");
    }
  };

  const login = (username, password, role) => {
    const cleanUser = username?.trim().toLowerCase();
    
    // Check in global list or fabricate
    const found = allDbUsers.find((u) => u.username.toLowerCase() === cleanUser);

    let loggedInProfile;
    if (found) {
      loggedInProfile = { ...found };
    } else {
      loggedInProfile = {
        role: role || "student",
        username: username,
        password: password || "password123",
        name: username.split("@")[0],
      };
    }

    setUser(loggedInProfile);
    localStorage.setItem("trustanchor_auth_user", JSON.stringify(loggedInProfile));

    // Save this specific account to this device's history
    if (typeof window !== "undefined") {
      const currentHistory = deviceHistory.filter(
        (item) => item.username.toLowerCase() !== loggedInProfile.username.toLowerCase()
      );
      const updated = [loggedInProfile, ...currentHistory];
      setDeviceHistory(updated);
      localStorage.setItem("trustanchor_device_account_history", JSON.stringify(updated));
    }

    return { success: true, user: loggedInProfile };
  };

  const clearDeviceHistory = () => {
    setDeviceHistory([]);
    localStorage.removeItem("trustanchor_device_account_history");
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
        deviceHistory,
        allDbUsers,
        isDevMode,
        toggleDevDevice,
        clearDeviceHistory,
        refreshGlobal: loadAllGlobalUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);