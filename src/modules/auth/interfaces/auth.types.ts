export type UserRole = "admin" | "hr_manager" | "employee";

export enum UserRoleEnum {
  admin = "admin",
  hr_manager = "hr_manager",
  employee = "employee"
}

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthContext {
  sessionUser: SessionUser | null;
}
