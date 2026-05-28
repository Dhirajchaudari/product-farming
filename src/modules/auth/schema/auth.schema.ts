export const authTypeDefs = /* GraphQL */ `
  enum UserRole {
    admin
    hr_manager
    employee
  }

  type SessionUser {
    id: ID!
    email: String!
    role: UserRole!
  }

  type Query {
    authHealth: String!
    me: SessionUser
    adminPing: String
  }

  type Mutation {
    login(email: String!, role: UserRole!): SessionUser!
    logout: Boolean!
  }
`;
