import { Field, ID, ObjectType, registerEnumType } from "type-graphql";

import type { SessionUser, UserRole } from "../interfaces/auth.types.js";

export enum UserRoleEnum {
  admin = "admin",
  hr_manager = "hr_manager",
  employee = "employee"
}

registerEnumType(UserRoleEnum, {
  name: "UserRole"
});

@ObjectType()
export class SessionUserType implements SessionUser {
  @Field(() => ID)
  public id!: string;

  @Field()
  public email!: string;

  @Field(() => UserRoleEnum)
  public role!: UserRole;
}
