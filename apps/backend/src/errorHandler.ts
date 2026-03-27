import { APIError } from "better-auth";
import type { ErrorHandler } from "elysia";
import { AppError } from "@cvsa/core";
import type { ErrorResponseDto } from "@cvsa/core";
import { getErrorResponse } from "@/common/error";

const AUTH_CONFLICT_CODES = [
	"USERNAME_IS_ALREADY_TAKEN",
	"USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
] as const;

const AUTH_INVALID_CODES = [
	"INVALID_CREDENTIALS",
	"INVALID_EMAIL_OR_PASSWORD",
	"USER_NOT_FOUND",
	"EMAIL_NOT_VERIFIED",
] as const;

type AuthConflictCode = (typeof AUTH_CONFLICT_CODES)[number];
type AuthInvalidCode = (typeof AUTH_INVALID_CODES)[number];

type StatusDecorator = ReturnType<ErrorHandler<{ readonly AppError: AppError }>>["status"];

const response = {
	appError: (status: StatusDecorator, error: AppError) =>
		getErrorResponse(status, error.statusCode, {
			code: error.code as ErrorResponseDto["code"],
			message: error.message,
		}),

	notFound: (status: StatusDecorator) =>
		getErrorResponse(status, 404, {
			code: "NOT_FOUND",
			message: "The requested resource was not found.",
		}),

	validation: (
		status: StatusDecorator,
		error: { message: string; detail: (msg: string) => unknown }
	) => {
		const detail = error.detail(error.message);
		return getErrorResponse(status, 422, {
			code: "VALIDATION_ERROR",
			message: typeof detail === "string" ? detail : (detail as { summary: string }).summary,
		});
	},

	betterAuthConflict: (status: StatusDecorator, error: APIError) =>
		getErrorResponse(status, 409, {
			code: (error.body?.code || "ENTITY_CONFLICT") as ErrorResponseDto["code"],
			message: error.body?.message,
		}),

	betterAuthInvalidCred: (status: StatusDecorator) =>
		getErrorResponse(status, 401, {
			code: "INVALID_CREDENTIALS",
			message: "Provided credentials are invalid.",
		}),

	betterAuthGeneral: (status: StatusDecorator, error: APIError) =>
		getErrorResponse(status, error.statusCode, {
			code: (error.body?.code || "AUTH_ERROR") as ErrorResponseDto["code"],
			message: error.body?.message,
		}),

	internal: (status: StatusDecorator) =>
		getErrorResponse(status, 500, {
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error",
		}),
} as const;

export const errorHandler: ErrorHandler<{
	readonly AppError: AppError;
}> = ({ code, status, error }) => {
	if (AppError.isAppError(error)) {
		return response.appError(status, error);
	}

	if (code === "NOT_FOUND") {
		return response.notFound(status);
	}

	if (code === "VALIDATION") {
		return response.validation(status, error);
	}

	if (error instanceof APIError) {
		const bodyCode = error.body?.code || "";

		if (AUTH_CONFLICT_CODES.includes(bodyCode as AuthConflictCode)) {
			return response.betterAuthConflict(status, error);
		}

		if (AUTH_INVALID_CODES.includes(bodyCode as AuthInvalidCode)) {
			return response.betterAuthInvalidCred(status);
		}

		return response.betterAuthGeneral(status, error);
	}

	return response.internal(status);
};
