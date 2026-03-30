export interface IDetailsService<T> {
	getDetails(id: number | string): Promise<T | null>;
}
