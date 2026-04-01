import type { PrismaClient } from "@cvsa/db";

export type TxClient = Omit<
	PrismaClient,
	"$transaction" | "$connect" | "$disconnect" | "$on" | "$use"
>;
