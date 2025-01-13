-- init.sql

-- Create the schema
CREATE SCHEMA IF NOT EXISTS cache_research;

-- Create the enum type for opcode
CREATE TYPE cache_research.opcode_enum AS ENUM ('SLOAD', 'SSTORE');

-- Create the table with a case-sensitive name
CREATE TABLE cache_research."StorageAccess" (
    id SERIAL PRIMARY KEY,
    epoch INT NOT NULL,
    blockNumber INT NOT NULL,
    blockTimestamp INT NOT NULL,
    txHash TEXT NOT NULL,
    opcode cache_research.opcode_enum NOT NULL,
    address TEXT NOT NULL,
    slot TEXT NOT NULL,
    isWarm BOOLEAN NOT NULL,
    accessCount INT NOT NULL
);

CREATE TABLE cache_research."Cache" (
    id SERIAL PRIMARY KEY,
    slot TEXT NOT NULL,
    ttl TEXT NOT NULL,
    accessCount INT NOT NULL
);

CREATE TABLE cache_research."Tracking" (
    id SERIAL PRIMARY KEY,
    lastEpoch INT NOT NULL
);

CREATE TABLE cache_research."Report" (
    id SERIAL PRIMARY KEY,
    ttl TEXT NOT NULL,
    blockNumber INT NOT NULL,
    hit INT NOT NULL,
    miss INT NOT NULL,
    cacheSize INT NOT NULL,
    unusedCacheSize INT NOT NULL
);

CREATE OR REPLACE VIEW public."StorageAccess" AS
SELECT id, epoch, blockNumber, blockTimestamp, txHash, opcode, address, slot, isWarm, accessCount
FROM cache_research."StorageAccess";