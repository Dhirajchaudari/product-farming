import { Field, ID, ObjectType, registerEnumType } from "type-graphql";

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
