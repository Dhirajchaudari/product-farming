import { Field, ID, InputType, ObjectType, registerEnumType } from "type-graphql";

import type { SessionUser, UserRole } from "../interfaces/auth.types.js";
import { UserRoleEnum } from "../interfaces/auth.types.js";

registerEnumType(UserRoleEnum, {
  name: "UserRole"
});

@ObjectType()
export class SessionUserType implements SessionUser {
  @Field(() => ID)
  public id!: string;

  @Field(() => String)
  public email!: string;

  @Field(() => UserRoleEnum)
  public role!: UserRole;
}

@ObjectType()
export class AuthOperationResultType {
  @Field(() => Boolean)
  public success!: boolean;

  @Field(() => String, { nullable: true })
  public message?: string;
}

@InputType()
export class LoginInputType {
  @Field(() => String)
  public email!: string;

  @Field(() => String, { nullable: true })
  public password?: string;

  @Field(() => UserRoleEnum, { nullable: true })
  public role?: UserRole;
}
