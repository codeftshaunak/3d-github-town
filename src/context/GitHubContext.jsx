import React, { createContext, useContext, useState, useEffect } from "react";

const GitHubContext = createContext();

// Helper function to get fetch options with authentication
const getFetchOptions = () => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  if (token) {
    return {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    };
  }
  return {};
};

// Popular GitHub users for initial town population
const DEFAULT_USERS = [
  "torvalds",
  "gaearon",
  "addyosmani",
  "sindresorhus",
  "tj",
  "paulirish",
  "kentcdodds",
  "wesbos",
  "getify",
  "ahejlsberg",
  "taylorotwell",
  "JakeWharton",
  "mojombo",
  "dhh",
  "defunkt",
  "pjhyett",
  "unclebob",
  "shanselman",
  "migueldeicaza",
  "stretchr",
  "BurntSushi",
  "github",
  "fabpot",
  "igrigorik",
  "mitsuhiko",
  "bcrypt",
  "antirez",
  "nodejs",
  "jeresig",
  "tenderlove",
  "ry",
  "schacon",
  "holman",
  "technoweenie",
  "mdo",
  "fat",
  "thomasf",
  "koush",
  "Automattic",
  "isaacs",
  "jakubroztocil",
  "chrissimpkins",
  "IgorMinar",
  "yyx990803",
  "sebmck",
  "feross",
  "MikeMcQuaid",
  "LeaVerou",
  "madrobby",
  "wycats",
  "codeftshaunak",
];

export function GitHubProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newlyAddedUser, setNewlyAddedUser] = useState(null);

  // Load default users on mount
  useEffect(() => {
    const loadDefaultUsers = async () => {
      setLoading(true);
      const fetchedUsers = [];

      console.log("Starting to load default users...");

      // Fetch users in batches to avoid rate limiting
      for (let i = 0; i < DEFAULT_USERS.length; i += 10) {
        const batch = DEFAULT_USERS.slice(i, i + 10);
        const promises = batch.map((username) =>
          fetch(`https://api.github.com/users/${username}`, getFetchOptions())
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                console.error(`Failed to fetch ${username}: ${res.status}`);
                return null;
              }
            })
            .catch((err) => {
              console.error(`Error fetching ${username}:`, err);
              return null;
            }),
        );

        const results = await Promise.all(promises);
        const validResults = results.filter(Boolean);
        fetchedUsers.push(...validResults);
        console.log(
          `Loaded ${validResults.length} users, total: ${fetchedUsers.length}`,
        );

        // Small delay between batches
        if (i + 10 < DEFAULT_USERS.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log("Finished loading users:", fetchedUsers.length);
      setUsers(fetchedUsers);
      setLoading(false);
    };

    loadDefaultUsers();
  }, []);

  const searchUser = async (username) => {
    setSearchLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.github.com/users/${username}`,
        getFetchOptions(),
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("User not found");
        }
        throw new Error("Failed to fetch user data");
      }

      const userData = await response.json();

      // Add user if not already in the list
      setUsers((prevUsers) => {
        const exists = prevUsers.some((u) => u.login === userData.login);
        if (exists) {
          // User already exists, just select them
          setSelectedUser(userData);
          setNewlyAddedUser(userData.login);
          return prevUsers;
        }
        // New user added
        setNewlyAddedUser(userData.login);
        return [...prevUsers, userData];
      });

      setSelectedUser(userData);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching user:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const value = {
    users,
    setUsers,
    selectedUser,
    setSelectedUser,
    searchUser,
    searchLoading,
    loading,
    error,
    setError,
    newlyAddedUser,
    setNewlyAddedUser,
  };

  return (
    <GitHubContext.Provider value={value}>{children}</GitHubContext.Provider>
  );
}

export function useGitHub() {
  const context = useContext(GitHubContext);
  if (!context) {
    throw new Error("useGitHub must be used within a GitHubProvider");
  }
  return context;
}
