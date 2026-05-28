import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import type Context from "../../../types/context.type.js";
import { EmployeeService } from "../services/employee.service.js";
import {
  CreateEmployeeInput,
  EmployeeListInput,
  EmployeeListPageType,
  EmployeeType,
  JobTitleSalaryInsightsInput,
  JobTitleSalaryInsightsType,
  SalaryInsightsType,
  UpdateEmployeeInput
} from "../schema/employee.schema.js";

const employeeService = new EmployeeService();

@Resolver(() => EmployeeType)
export class EmployeeResolver {
  @Query(() => [EmployeeType])
  @UseMiddleware(isAuthenticated)
  public async employees(): Promise<EmployeeType[]> {
    return employeeService.list();
  }

  @Query(() => EmployeeListPageType)
  @UseMiddleware(isAuthenticated)
  public async employeesPage(
    @Arg("input", () => EmployeeListInput, { nullable: true }) input?: EmployeeListInput
  ): Promise<EmployeeListPageType> {
    return employeeService.listPage(input ?? {});
  }

  @Query(() => EmployeeType, { nullable: true })
  @UseMiddleware(isAuthenticated)
  public async employeeById(@Arg("id", () => String) id: string): Promise<EmployeeType | null> {
    return employeeService.getById(id);
  }

  @Query(() => SalaryInsightsType)
  @UseMiddleware(isAuthenticated)
  public async salaryInsightsByCountry(@Arg("country", () => String) country: string): Promise<SalaryInsightsType> {
    return employeeService.getSalaryInsightsByCountry(country);
  }

  @Query(() => JobTitleSalaryInsightsType)
  @UseMiddleware(isAuthenticated)
  public async jobTitleSalaryInsights(
    @Arg("input", () => JobTitleSalaryInsightsInput) input: JobTitleSalaryInsightsInput
  ): Promise<JobTitleSalaryInsightsType> {
    return employeeService.getJobTitleSalaryInsights(input.country, input.jobTitle);
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated)
  public async createEmployee(
    @Arg("input", () => CreateEmployeeInput) input: CreateEmployeeInput,
    @Ctx() _context: Context
  ): Promise<EmployeeType> {
    return employeeService.create(input);
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated)
  public async updateEmployee(@Arg("input", () => UpdateEmployeeInput) input: UpdateEmployeeInput): Promise<EmployeeType> {
    return employeeService.update(input);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  public async deleteEmployee(@Arg("id", () => String) id: string): Promise<boolean> {
    return employeeService.remove(id);
  }
}
