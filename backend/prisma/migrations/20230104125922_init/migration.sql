-- CreateTable
CREATE TABLE "User" (
    "id" INT8 NOT NULL,
    "phoneNumber" STRING NOT NULL,
    "session" STRING NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifier" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "chatId" INT8 NOT NULL,
    "rule" STRING NOT NULL,
    "message" STRING NOT NULL,
    "userId" INT8 NOT NULL,

    CONSTRAINT "Notifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- AddForeignKey
ALTER TABLE "Notifier" ADD CONSTRAINT "Notifier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
