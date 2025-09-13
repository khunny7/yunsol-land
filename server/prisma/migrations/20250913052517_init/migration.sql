-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "inventory" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exits" JSONB NOT NULL,
    "staticFlags" JSONB NOT NULL
);

-- CreateTable
CREATE TABLE "WorldMeta" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" JSONB NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");
