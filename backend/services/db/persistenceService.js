import { env } from "../../config/env.js";
import { getPrisma, isPostgresEnabled } from "../../utils/postgres.js";

export const getPersistenceStatus = async () => {
  const status = {
    mode: env.DB_MODE,
    configured: Boolean(env.DATABASE_URL),
    provider: isPostgresEnabled() ? "postgresql" : "json-demo",
    connected: false,
  };

  if (!isPostgresEnabled()) return status;

  try {
    const prisma = await getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    status.connected = true;
  } catch (error) {
    status.error = error.message;
  }

  return status;
};

export const withPostgresTransaction = async (callback) => {
  if (!isPostgresEnabled()) {
    throw new Error("PostgreSQL persistence is not enabled. Set BIZLIFT_DB_MODE=postgres and DATABASE_URL.");
  }

  const prisma = await getPrisma();
  return prisma.$transaction((tx) => callback(tx));
};
