-- CreateTable
CREATE TABLE "User" (
    "id" STRING NOT NULL,
    "number" INT4 NOT NULL,
    "session" STRING NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifier" (
    "id" STRING NOT NULL,
    "chatId" INT4 NOT NULL,
    "rule" STRING NOT NULL,
    "userId" STRING NOT NULL,

    CONSTRAINT "Notifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_number_key" ON "User"("number");

-- AddForeignKey
ALTER TABLE "Notifier" ADD CONSTRAINT "Notifier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
