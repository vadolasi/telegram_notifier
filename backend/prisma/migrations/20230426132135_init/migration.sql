-- CreateTable
CREATE TABLE "User" (
    "id" STRING NOT NULL,
    "email" STRING NOT NULL,
    "password" STRING NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phoneNumber" (
    "id" INT8 NOT NULL,
    "phoneNumber" STRING NOT NULL,
    "session" STRING NOT NULL,
    "userId" STRING NOT NULL,

    CONSTRAINT "phoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifier" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "chatId" INT8 NOT NULL,
    "rule" STRING NOT NULL,
    "message" STRING NOT NULL,
    "phoneId" INT8 NOT NULL,

    CONSTRAINT "Notifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forwarder" (
    "id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "fromChat" INT8 NOT NULL,
    "toChat" INT8 NOT NULL,
    "rule" STRING NOT NULL,
    "phoneId" INT8 NOT NULL,

    CONSTRAINT "Forwarder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "phoneNumber_phoneNumber_key" ON "phoneNumber"("phoneNumber");

-- AddForeignKey
ALTER TABLE "phoneNumber" ADD CONSTRAINT "phoneNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifier" ADD CONSTRAINT "Notifier_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "phoneNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forwarder" ADD CONSTRAINT "Forwarder_phoneId_fkey" FOREIGN KEY ("phoneId") REFERENCES "phoneNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
