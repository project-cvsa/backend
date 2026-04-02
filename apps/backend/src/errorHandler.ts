import { Elysia } from "elysia";
import { AppError, BetterAuthAPIError } from "@cvsa/core";
import type { ErrorResponseDto } from "@cvsa/core";
import { getErrorResponse } from "@/common/error";
import { getTraceId } from "./onAfterHandle";
import { i18nMiddleware } from "@/middlewares/i18n";

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

export const errorHandler = new Elysia()
	.error({
		AppError,
	})

	.use(i18nMiddleware)
	.onError({ as: "global" }, ({ code, status, error, set, locale }) => {
		const traceId = getTraceId();
		if (traceId) {
			set.headers["X-Trace-ID"] = traceId;
		}

		if (AppError.isAppError(error)) {
			return getErrorResponse(status, error.statusCode, locale, {
				code: error.code as ErrorResponseDto["code"],
				message: error.message,
			});
		}

		if (code === "NOT_FOUND") {
			return getErrorResponse(status, 404, locale, {
				code: "NOT_FOUND",
				message: "The requested resource was not found.",
			});
		}

		if (code === "VALIDATION") {
			const detail = error.detail(error.message);
			const message = typeof detail === "string" ? detail : detail.summary;
			return getErrorResponse(status, 422, locale, {
				code: "VALIDATION_ERROR",
				message,
			});
		}

		if (error instanceof BetterAuthAPIError) {
			const bodyCode = error.body?.code || "";

			if (AUTH_CONFLICT_CODES.includes(bodyCode as AuthConflictCode)) {
				return getErrorResponse(status, 409, locale, {
					code: (error.body?.code || "ENTITY_CONFLICT") as ErrorResponseDto["code"],
					message: error.body?.message,
				});
			}

			if (AUTH_INVALID_CODES.includes(bodyCode as AuthInvalidCode)) {
				return getErrorResponse(status, 401, locale, {
					code: "INVALID_CREDENTIALS",
					message: "Provided credentials are invalid.",
				});
			}

			if (error.statusCode < 500) {
				return getErrorResponse(status, error.statusCode, locale, {
					code: "UNAUTHORIZED",
					message: error.body?.message,
				});
			}
		}

		return getErrorResponse(status, 500, locale, {
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error",
		});
	});
