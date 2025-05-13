-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PhotoQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "imageData" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    CONSTRAINT "PhotoQueueItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PhotoQueueItem" ("createdAt", "filePath", "id", "orderId", "status", "updatedAt") SELECT "createdAt", "filePath", "id", "orderId", "status", "updatedAt" FROM "PhotoQueueItem";
DROP TABLE "PhotoQueueItem";
ALTER TABLE "new_PhotoQueueItem" RENAME TO "PhotoQueueItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
