import type { TxClient } from "./TxClient";

export interface IDetailsRepository<T> {
	getDetailsById(id: number | string, tx?: TxClient): Promise<T | null>;
}
