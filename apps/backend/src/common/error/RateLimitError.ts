import { AppError } from "@common/error";

export class RateLimitError extends AppError {
	constructor(message = "Request rate limit exceeded") {
		super(message, "RATE_LIMIT_ERROR", 429);
	}
}
