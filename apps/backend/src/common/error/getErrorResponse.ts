import type { ErrorResponseDto } from "@cvsa/core";

// biome-ignore lint/suspicious/noExplicitAny: Utility type
type StatusFunc = (code: number, response: any) => any;

export const getErrorResponse = <T extends StatusFunc>(
	statusFunc: T,
	statusCode: number,
	data: ErrorResponseDto
): ReturnType<T> => {
	return statusFunc(statusCode, data);
};
