import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../app.js";

describe("employee GraphQL CRUD", () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  async function loginAndGetCookie(app: ReturnType<typeof buildApp>): Promise<string> {
    const login = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: "mutation { login(email: \"hr@product-farming.test\", role: hr_manager) { id } }"
      }
    });
    return login.headers["set-cookie"] as string;
  }

  it("creates, updates, lists, and deletes an employee", async () => {
    const app = buildApp();
    apps.push(app);
    const cookie = await loginAndGetCookie(app);

    const createResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: `mutation($input: CreateEmployeeInput!) {
          createEmployee(input: $input) { id fullName jobTitle country salary currency isActive }
        }`,
        variables: {
          input: {
            fullName: "Dhiraj Chaudhari",
            jobTitle: "HR Manager",
            country: "India",
            salary: 120000,
            currency: "INR"
          }
        }
      }
    });

    const createdId = (createResponse.json() as any).data.createEmployee.id as string;
    expect(createdId).toBeDefined();

    const updateResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: `mutation($input: UpdateEmployeeInput!) {
          updateEmployee(input: $input) { id salary isActive }
        }`,
        variables: {
          input: {
            id: createdId,
            salary: 125000,
            isActive: true
          }
        }
      }
    });

    expect((updateResponse.json() as any).data.updateEmployee.salary).toBe(125000);

    const listResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: "query { employees { id } }"
      }
    });

    expect((listResponse.json() as any).data.employees.length).toBeGreaterThan(0);

    const deleteResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: "mutation($id: String!) { deleteEmployee(id: $id) }",
        variables: { id: createdId }
      }
    });

    expect((deleteResponse.json() as any).data.deleteEmployee).toBe(true);
  });
});
