import Elysia from "elysia";
import { signupHandler } from "./signup";
import { getCurrentUserHandler } from "./currentUser";
import { authService } from "@services/index";

export const authServicePlugin = new Elysia({ name: "auth-service" }).decorate(
    "authService",
    authService
);

export const authHandler = new Elysia()
    .use(signupHandler)
    .use(getCurrentUserHandler);
