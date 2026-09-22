
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "subdomain" TEXT;

-- CreateTable
CREATE TABLE "GithubConnection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "secrets" JSONB NOT NULL,
    "repoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GithubConnection_projectId_key" ON "GithubConnection"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_subdomain_key" ON "Project"("subdomain");

-- AddForeignKey
ALTER TABLE "GithubConnection" ADD CONSTRAINT "GithubConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

