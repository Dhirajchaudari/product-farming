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
