import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import type Context from "../../../types/context.type.js";
import { EmployeeService } from "../services/employee.service.js";
import {
  CreateEmployeeInput,
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
  public employees(): EmployeeType[] {
    return employeeService.list();
  }

  @Query(() => EmployeeType, { nullable: true })
  @UseMiddleware(isAuthenticated)
  public employeeById(@Arg("id", () => String) id: string): EmployeeType | null {
    return employeeService.getById(id);
  }

  @Query(() => SalaryInsightsType)
  @UseMiddleware(isAuthenticated)
  public salaryInsightsByCountry(@Arg("country", () => String) country: string): SalaryInsightsType {
    return employeeService.getSalaryInsightsByCountry(country);
  }

  @Query(() => JobTitleSalaryInsightsType)
  @UseMiddleware(isAuthenticated)
  public jobTitleSalaryInsights(@Arg("input", () => JobTitleSalaryInsightsInput) input: JobTitleSalaryInsightsInput): JobTitleSalaryInsightsType {
    return employeeService.getJobTitleSalaryInsights(input.country, input.jobTitle);
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated)
  public createEmployee(@Arg("input", () => CreateEmployeeInput) input: CreateEmployeeInput, @Ctx() _context: Context): EmployeeType {
    return employeeService.create(input);
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated)
  public updateEmployee(@Arg("input", () => UpdateEmployeeInput) input: UpdateEmployeeInput): EmployeeType {
    return employeeService.update(input);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  public deleteEmployee(@Arg("id", () => String) id: string): boolean {
    return employeeService.remove(id);
  }
}
