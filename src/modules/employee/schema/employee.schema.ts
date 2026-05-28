import { Field, ID, InputType, ObjectType } from "type-graphql";

@ObjectType()
export class EmployeeType {
  @Field(() => ID)
  public id!: string;

  @Field(() => String)
  public fullName!: string;

  @Field(() => String)
  public email!: string;

  @Field(() => String)
  public employeeCode!: string;

  @Field(() => String)
  public jobTitle!: string;

  @Field(() => String)
  public department!: string;

  @Field(() => String)
  public country!: string;

  @Field(() => Number)
  public salary!: number;

  @Field(() => String)
  public currency!: string;

  @Field(() => String)
  public dateOfJoining!: string;

  @Field(() => String)
  public employmentType!: string;

  @Field(() => String)
  public status!: string;

  @Field(() => String, { nullable: true })
  public managerName?: string;

  @Field(() => Boolean)
  public isActive!: boolean;

  @Field(() => String)
  public createdAt!: string;

  @Field(() => String)
  public updatedAt!: string;
}

@ObjectType()
export class SalaryInsightsType {
  @Field(() => String)
  public country!: string;

  @Field(() => Number)
  public minimumSalary!: number;

  @Field(() => Number)
  public maximumSalary!: number;

  @Field(() => Number)
  public averageSalary!: number;

  @Field(() => Number)
  public employeeCount!: number;
}

@ObjectType()
export class JobTitleSalaryInsightsType {
  @Field(() => String)
  public country!: string;

  @Field(() => String)
  public jobTitle!: string;

  @Field(() => Number)
  public averageSalary!: number;

  @Field(() => Number)
  public employeeCount!: number;
}

@ObjectType()
export class EmployeeListPageType {
  @Field(() => [EmployeeType])
  public items!: EmployeeType[];

  @Field(() => Number)
  public totalCount!: number;

  @Field(() => Number)
  public page!: number;

  @Field(() => Number)
  public pageSize!: number;

  @Field(() => Number)
  public totalPages!: number;
}

@InputType()
export class CreateEmployeeInput {
  @Field(() => String)
  public fullName!: string;

  @Field(() => String)
  public email!: string;

  @Field(() => String)
  public jobTitle!: string;

  @Field(() => String)
  public department!: string;

  @Field(() => String)
  public country!: string;

  @Field(() => Number)
  public salary!: number;

  @Field(() => String)
  public currency!: string;

  @Field(() => String)
  public dateOfJoining!: string;

  @Field(() => String, { nullable: true })
  public employmentType?: string;

  @Field(() => String, { nullable: true })
  public status?: string;

  @Field(() => String, { nullable: true })
  public managerName?: string;
}

@InputType()
export class UpdateEmployeeInput {
  @Field(() => String)
  public id!: string;

  @Field(() => String, { nullable: true })
  public fullName?: string;

  @Field(() => String, { nullable: true })
  public email?: string;

  @Field(() => String, { nullable: true })
  public jobTitle?: string;

  @Field(() => String, { nullable: true })
  public department?: string;

  @Field(() => String, { nullable: true })
  public country?: string;

  @Field(() => Number, { nullable: true })
  public salary?: number;

  @Field(() => String, { nullable: true })
  public currency?: string;

  @Field(() => String, { nullable: true })
  public dateOfJoining?: string;

  @Field(() => String, { nullable: true })
  public employmentType?: string;

  @Field(() => String, { nullable: true })
  public status?: string;

  @Field(() => String, { nullable: true })
  public managerName?: string;

  @Field(() => Boolean, { nullable: true })
  public isActive?: boolean;
}

@InputType()
export class JobTitleSalaryInsightsInput {
  @Field(() => String)
  public country!: string;

  @Field(() => String)
  public jobTitle!: string;
}

@InputType()
export class EmployeeListInput {
  @Field(() => String, { nullable: true })
  public search?: string;

  @Field(() => String, { nullable: true })
  public department?: string;

  @Field(() => String, { nullable: true })
  public status?: string;

  @Field(() => Number, { nullable: true })
  public page?: number;

  @Field(() => Number, { nullable: true })
  public pageSize?: number;
}
