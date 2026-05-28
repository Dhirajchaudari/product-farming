import { Ctx, Query, Resolver, UseMiddleware } from "type-graphql";

import { isAuthenticated } from "../../../middlewares/authentication.js";
import { isEmployee } from "../../../middlewares/authorization.js";
import type Context from "../../../types/context.type.js";
import { EmployeeType, PayslipType } from "../schema/employee.schema.js";
import { EmployeeService } from "../services/employee.service.js";
import { PayslipService } from "../services/payslip.service.js";

const employeeService = new EmployeeService();
const payslipService = new PayslipService();

@Resolver()
export class PortalResolver {
  @Query(() => EmployeeType, { nullable: true })
  @UseMiddleware(isAuthenticated, isEmployee)
  public async myEmployeeProfile(@Ctx() context: Context): Promise<EmployeeType | null> {
    if (!context.sessionUser) {
      return null;
    }
    return employeeService.getByEmail(context.sessionUser.email);
  }

  @Query(() => [PayslipType])
  @UseMiddleware(isAuthenticated, isEmployee)
  public async myPayslips(@Ctx() context: Context): Promise<PayslipType[]> {
    if (!context.sessionUser) {
      return [];
    }
    return payslipService.listForEmployeeEmail(context.sessionUser.email);
  }
}
