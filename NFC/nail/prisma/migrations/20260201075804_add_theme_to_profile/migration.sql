-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "handle" TEXT,
    "displayName" TEXT,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "linksJson" TEXT NOT NULL DEFAULT '[]',
    "activeTagId" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'STANDARD',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Profile" ("activeTagId", "avatarUrl", "bio", "createdAt", "displayName", "handle", "id", "linksJson", "updatedAt", "userId") SELECT "activeTagId", "avatarUrl", "bio", "createdAt", "displayName", "handle", "id", "linksJson", "updatedAt", "userId" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");
CREATE UNIQUE INDEX "Profile_handle_key" ON "Profile"("handle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
