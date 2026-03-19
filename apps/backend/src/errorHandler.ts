import { ZodError } from "zod";
import { APIError } from "better-auth";
import type { ErrorHandler } from "elysia";
import { AppError } from "@project-cvsa/core";
import { getErrorResponse } from "@/common/error";

export const errorHandler: ErrorHandler<{
	readonly AppError: AppError;
}> = ({ code, status, error }) => {
	if (AppError.isAppError(error)) {
		return getErrorResponse(status, error.statusCode, {
			code: error.code,
			message: error.message,
		});
	}
	if (code === "NOT_FOUND")
		return getErrorResponse(status, 404, {
			code: "NOT_FOUND",
			message: "The requested resource was not found.",
		});
	if (code === "VALIDATION") {
		const detail = error.detail(error.message);
		if (typeof detail === "string") {
			return getErrorResponse(status, 422, {
				code: "VALIDATION_ERROR",
				message: detail,
			});
		}
		return getErrorResponse(status, 422, {
			code: "VALIDATION_ERROR",
			message: detail.summary,
		});
	}
	if (error instanceof ZodError) {
		return getErrorResponse(status, 422, {
			code: "VALIDATION_ERROR",
			message: error.message,
		});
	}
	if (error instanceof APIError) {
		if (
			["USERNAME_IS_ALREADY_TAKEN", "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"].includes(
				error.body?.code || ""
			)
		) {
			return getErrorResponse(status, 409, {
				code: error.body?.code || "ENTITY_CONFLICT",
				message: error.body?.message,
			});
		}
		if (
			[
				"INVALID_CREDENTIALS",
				"INVALID_EMAIL_OR_PASSWORD",
				"USER_NOT_FOUND",
				"EMAIL_NOT_VERIFIED",
			].includes(error.body?.code || "")
		) {
			return getErrorResponse(status, 401, {
				code: "INVALID_CREDENTIALS",
				message: error.body?.message,
			});
		}
		return getErrorResponse(status, error.statusCode, {
			code: error.body?.code || "AUTH_ERROR",
			message: error.body?.message,
		});
	}
	return getErrorResponse(status, 500, {
		code: "SERVER_ERROR",
		message: "Internal server error",
	});
};
