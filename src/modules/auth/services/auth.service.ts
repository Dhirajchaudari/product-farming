import type { SessionUser } from "../interfaces/auth.types.js";

export class AuthService {
  public buildSessionUser(email: string): SessionUser {
    return {
      id: "placeholder-user-id",
      email,
      role: "hr_manager"
    };
  }
}
