export interface SessionUser {
  id: string;
  email: string;
  role: "admin" | "hr_manager" | "employee";
}
