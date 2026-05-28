import { getEnvConfig } from "../../../utils/env.config.js";
import { AuthService } from "../../auth/services/auth.service.js";
import type { EmployeeRecord } from "../interfaces/employee.types.js";

export interface EmployeeInviteResult {
  setupPasswordUrl: string;
  otpCode: string;
}

export class EmployeeOnboardingService {
  private readonly authService = new AuthService(null);

  public buildSetupPasswordUrl(email: string, otp: string): string {
    const env = getEnvConfig();
    const base = env.frontendBaseUrl.replace(/\/$/, "");
    const path = env.setPasswordPath.startsWith("/") ? env.setPasswordPath : `/${env.setPasswordPath}`;
    const params = new URLSearchParams({ email, otp });
    return `${base}${path}?${params.toString()}`;
  }

  public async provisionEmployeeAccess(employee: EmployeeRecord): Promise<EmployeeInviteResult> {
    const env = getEnvConfig();
    const otpCode = await this.authService.requestEmployeeInviteOtp(
      employee.email,
      employee.id,
      env.otpLength,
      env.employeeInviteOtpTtlMinutes
    );

    return {
      otpCode,
      setupPasswordUrl: this.buildSetupPasswordUrl(employee.email, otpCode)
    };
  }
}
