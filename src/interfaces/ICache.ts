import { PrismaClient } from "@prisma/client";
import { Report } from "../types/types";

interface ICache {
  cache: Map<string, number>;
  reports: Map<number, Report>;

  initializeReport(blockNumber: number): void;
  storeCache(prisma: PrismaClient): void;
  deleteCache(prisma: PrismaClient): void;
  loadCache(prisma: PrismaClient): void;
}

export default ICache;