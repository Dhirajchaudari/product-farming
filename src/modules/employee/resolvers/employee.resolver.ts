import { Arg, Ctx, Mutation, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import type Context from "../../../types/context.type.js";
import { EmployeeService } from "../services/employee.service.js";
import { CreateEmployeeInput, EmployeeType, UpdateEmployeeInput } from "../schema/employee.schema.js";

@Resolver(() => EmployeeType)
export class EmployeeResolver {
  private readonly employeeService: EmployeeService;

  public constructor() {
    this.employeeService = new EmployeeService();
  }

  @Query(() => [EmployeeType])
  @UseMiddleware(isAuthenticated)
  public employees(): EmployeeType[] {
    return this.employeeService.list();
  }

  @Query(() => EmployeeType, { nullable: true })
  @UseMiddleware(isAuthenticated)
  public employeeById(@Arg("id", () => String) id: string): EmployeeType | null {
    return this.employeeService.getById(id);
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated)
  public createEmployee(@Arg("input", () => CreateEmployeeInput) input: CreateEmployeeInput, @Ctx() _context: Context): EmployeeType {
    return this.employeeService.create(input);
  }

  @Mutation(() => EmployeeType)
  @UseMiddleware(isAuthenticated)
  public updateEmployee(@Arg("input", () => UpdateEmployeeInput) input: UpdateEmployeeInput): EmployeeType {
    return this.employeeService.update(input);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuthenticated)
  public deleteEmployee(@Arg("id", () => String) id: string): boolean {
    return this.employeeService.remove(id);
  }
}
