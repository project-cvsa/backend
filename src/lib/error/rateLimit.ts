import { AppError } from ".";

export class RateLimitError extends AppError {
    constructor(message = "访问过于频繁") {
        super(message, "RATE_LIMIT_ERROR", 429);
    }
}
