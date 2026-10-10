import crypto from "crypto";
import { env } from "../config/env.js";

let prismaPromise = null;

export const isPostgresEnabled = () =>
  env.DB_MODE === "postgres" && Boolean(env.DATABASE_URL);

export const getPrisma = async () => {
  if (!isPostgresEnabled()) return null;
  if (!prismaPromise) {
    prismaPromise = import("@prisma/client").then(({ PrismaClient }) => {
      const client = new PrismaClient();
      return client;
    });
  }
  return prismaPromise;
};

export const hashSessionToken = (token) =>
  crypto.createHash("sha256").update(String(token)).digest("hex");

export const closePrisma = async () => {
  if (!prismaPromise) return;
  const prisma = await prismaPromise;
  await prisma.$disconnect();
  prismaPromise = null;
};
