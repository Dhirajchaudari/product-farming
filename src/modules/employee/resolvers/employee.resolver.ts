import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import { isHrOrAdmin } from "../../../middlewares/authorization.js";
import { enqueueCommunicationEmail } from "../../../queue/index.queue.js";
import type Context from "../../../types/context.type.js";
import { EmailTemplateType } from "../../../utils/constants/emails.constant.js";
import { getEnvConfig } from "../../../utils/env.config.js";
import { EmployeeOnboardingService } from "../services/employee-onboarding.service.js";
import { EmployeeService } from "../services/employee.service.js";
import { PayslipService } from "../services/payslip.service.js";
import {
  CreateEmployeeInput,
  EmployeeListInput,
  EmployeeListPageType,
  EmployeeType,
  JobTitleSalaryInsightsInput,
  JobTitleSalaryInsightsType,
  PayslipDownloadUrlType,
  PayslipType,
  SalaryInsightsType,
  UpdateEmployeeInput
} from "../schema/employee.schema.js";

const employeeService = new EmployeeService();

export function resetEmployeeStateForTests(): void {
  employeeService.clearMemoryStoreForTests();
}
const onboardingService = new EmployeeOnboardingService();
const payslipService = new PayslipService();
const env = getEnvConfig();

@Resolver(() => EmployeeType)
export class EmployeeResolver {
  @Query(() => [EmployeeType])
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async employees(): Promise<EmployeeType[]> {
    return employeeService.list();
  }

  @Query(() => EmployeeListPageType)
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async employeesPage(
    @Arg("input", () => EmployeeListInput, { nullable: true }) input?: EmployeeListInput
  ): Promise<EmployeeListPageType> {
    return employeeService.listPage(input ?? {});
  }

  @Query(() => EmployeeType, { nullable: true })
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async employeeById(@Arg("id", () => String) id: string): Promise<EmployeeType | null> {
    return employeeService.getById(id);
  }

  @Query(() => SalaryInsightsType)
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async salaryInsightsByCountry(@Arg("country", () => String) country: string): Promise<SalaryInsightsType> {
    return employeeService.getSalaryInsightsByCountry(country);
  }

  @Query(() => JobTitleSalaryInsightsType)
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async jobTitleSalaryInsights(
    @Arg("input", () => JobTitleSalaryInsightsInput) input: JobTitleSalaryInsightsInput
  ): Promise<JobTitleSalaryInsightsType> {
    return employeeService.getJobTitleSalaryInsights(input.country, input.jobTitle);
  }

  @Query(() => [PayslipType])
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async employeePayslips(@Arg("employeeId", () => String) employeeId: string): Promise<PayslipType[]> {
    return payslipService.listForEmployeeId(employeeId);
  }

  @Query(() => PayslipDownloadUrlType)
  @UseMiddleware(isAuthenticated)
  public async payslipDownloadUrl(
    @Arg("payslipId", () => String) payslipId: string,
    @Ctx() context: Context
  ): Promise<PayslipDownloadUrlType> {
    if (!context.sessionUser) {
      throw new Error("UNAUTHENTICATED");
    }
    return payslipService.getDownloadUrl(payslipId, context.sessionUser);
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async createEmployee(
    @Arg("input", () => CreateEmployeeInput) input: CreateEmployeeInput,
    @Ctx() _context: Context
  ): Promise<EmployeeType> {
    const employee = await employeeService.create(input);

    if (env.nodeEnv !== "test") {
      try {
        const invite = await onboardingService.provisionEmployeeAccess(employee);
        await payslipService.createInitialPayslip(employee);
        await enqueueCommunicationEmail("employee-welcome-email", {
          type: EmailTemplateType.EMPLOYEE_WELCOME,
          data: {
            email: employee.email,
            fullName: employee.fullName,
            employeeCode: employee.employeeCode,
            jobTitle: employee.jobTitle,
            department: employee.department,
            setupPasswordUrl: invite.setupPasswordUrl
          }
        });
      } catch (error) {
        console.error("[employee] onboarding email/payslip failed", error);
      }
    }

    return employee;
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async updateEmployee(@Arg("input", () => UpdateEmployeeInput) input: UpdateEmployeeInput): Promise<EmployeeType> {
    return employeeService.update(input);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated, isHrOrAdmin)
  public async deleteEmployee(@Arg("id", () => String) id: string): Promise<boolean> {
    return employeeService.remove(id);
  }
}
