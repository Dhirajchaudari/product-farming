import { Field, ID, InputType, ObjectType } from "type-graphql";

@ObjectType()
export class EmployeeType {
  @Field(() => ID)
  public id!: string;

  @Field(() => String)
  public fullName!: string;

  @Field(() => String)
  public jobTitle!: string;

  @Field(() => String)
  public country!: string;

  @Field(() => Number)
  public salary!: number;

  @Field(() => String)
  public currency!: string;

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

@InputType()
export class CreateEmployeeInput {
  @Field(() => String)
  public fullName!: string;

  @Field(() => String)
  public jobTitle!: string;

  @Field(() => String)
  public country!: string;

  @Field(() => Number)
  public salary!: number;

  @Field(() => String)
  public currency!: string;
}

@InputType()
export class UpdateEmployeeInput {
  @Field(() => String)
  public id!: string;

  @Field(() => String, { nullable: true })
  public fullName?: string;

  @Field(() => String, { nullable: true })
  public jobTitle?: string;

  @Field(() => String, { nullable: true })
  public country?: string;

  @Field(() => Number, { nullable: true })
  public salary?: number;

  @Field(() => String, { nullable: true })
  public currency?: string;

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
