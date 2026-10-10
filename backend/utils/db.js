import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "../data/db.json");

let _db = null;

const loadDbFromFile = () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load DB from file, using memory:", error);
  }
  return null;
};

const saveDbToFile = (db) => {
  try {
    const data = JSON.stringify(db, null, 2);
    fs.writeFileSync(DB_PATH, data, "utf-8");
  } catch (error) {
    console.error("Failed to save DB to file:", error);
  }
};

const getDefaultDb = () => ({
  users: [
    {
      id: "user_office_admin_demo",
      officeId: "techpark-one",
      vendorId: null,
      name: "TechPark Admin",
      email: "admin@techparkone.com",
      role: "office_admin",
      passwordHash:
        "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "user_snapeats_demo",
      officeId: "techpark-one",
      vendorId: "snapeats",
      name: "SnapEats Manager",
      email: "snapeats@techparkone.com",
      role: "vendor",
      passwordHash:
        "fb6fc7bf583b5c01537e4d119d303e0581cc4983eab9ba6ee0a34f0aa1d9f9fd",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "user_quench_demo",
      officeId: "techpark-one",
      vendorId: "quench",
      name: "Quench Manager",
      email: "quench@techparkone.com",
      role: "vendor",
      passwordHash:
        "7d0ba987752031cc007aa94f83d9b0a5d1eceaf0503a177ea17ae13307b2eb8b",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "user_south_demo",
      officeId: "techpark-one",
      vendorId: "southdelights",
      name: "South Delights Manager",
      email: "southdelights@techparkone.com",
      role: "vendor",
      passwordHash:
        "2d4d6e4bf44f26816c9631a5453277e9618085060f6283d2a0bd3ab101fb0ba2",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  sessions: [],
  workspaces: {},
});

export const initDb = () => {
  if (!_db) {
    _db = loadDbFromFile() || getDefaultDb();
  }
};

export const readDb = () => {
  initDb();
  return _db;
};

export const writeDb = (newDb) => {
  if (newDb) {
    _db = newDb;
    saveDbToFile(_db);
  }
  return _db;
};

export const getWorkspaceFromDb = (workspaceKey) => {
  const db = readDb();
  return db.workspaces[workspaceKey] || null;
};

export const setWorkspaceInDb = (workspaceKey, data) => {
  const db = readDb();
  db.workspaces[workspaceKey] = data;
  saveDbToFile(db);
  return data;
};
