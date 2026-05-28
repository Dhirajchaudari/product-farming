export type UserRole = "admin" | "hr_manager" | "employee";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthContext {
  sessionUser: SessionUser | null;
}
