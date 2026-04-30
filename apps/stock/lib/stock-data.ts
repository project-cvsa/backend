export interface Stock {
	id: string;
	name: string;
	symbol: string;
	price: number;
	change: number;
	changePercent: number;
	sparkline: number[];
}

export interface MarketIndex {
	name: string;
	value: number;
	change: number;
	changePercent: number;
	history: number[];
	/** ISO string of the grid-snapped `now` used to compute windows (newest point). */
	baseTime: string;
}
