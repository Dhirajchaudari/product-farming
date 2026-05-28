import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../app.js";
import { resetAuthStateForTests } from "../../auth/resolvers/auth.resolver.js";
import { resetEmployeeStateForTests } from "../resolvers/employee.resolver.js";

describe("employee GraphQL CRUD", () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    resetAuthStateForTests();
    resetEmployeeStateForTests();
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  function extractSessionCookie(setCookieHeader: string | string[] | undefined): string {
    const raw = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
    if (!raw) {
      return "";
    }
    const match = raw.match(/pf_session_id=([^;]+)/);
    return match ? `pf_session_id=${match[1]}` : raw.split(";")[0];
  }

  async function loginAndGetCookie(app: ReturnType<typeof buildApp>): Promise<string> {
    const login = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: "mutation { login(email: \"hr@product-farming.test\", role: hr_manager) { id } }"
      }
    });
    return extractSessionCookie(login.headers["set-cookie"]);
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
          createEmployee(input: $input) { id fullName email employeeCode jobTitle department country salary currency isActive }
        }`,
        variables: {
          input: {
            fullName: "Dhiraj Chaudhari",
            email: "dhiraj@example.com",
            jobTitle: "HR Manager",
            department: "People Operations",
            country: "India",
            salary: 120000,
            currency: "INR",
            dateOfJoining: "2024-01-15T00:00:00.000Z",
            employmentType: "full_time",
            status: "active",
            managerName: "People Director"
          }
        }
      }
    });

    const createdId = (createResponse.json() as any).data.createEmployee.id as string;
    expect(createdId).toBeDefined();
    expect((createResponse.json() as any).data.createEmployee.department).toBe("People Operations");

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

    const pageResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: `query($input: EmployeeListInput) {
          employeesPage(input: $input) {
            totalCount
            page
            pageSize
            totalPages
            items { id fullName department status }
          }
        }`,
        variables: {
          input: {
            search: "dhiraj",
            department: "People Operations",
            status: "active",
            page: 1,
            pageSize: 5
          }
        }
      }
    });

    expect((pageResponse.json() as any).data.employeesPage).toMatchObject({
      totalCount: 1,
      page: 1,
      pageSize: 5,
      totalPages: 1
    });
    expect((pageResponse.json() as any).data.employeesPage.items[0].fullName).toBe("Dhiraj Chaudhari");

    const countryInsights = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: "query { salaryInsightsByCountry(country: \"India\") { minimumSalary maximumSalary averageSalary employeeCount } }"
      }
    });

    expect((countryInsights.json() as { data: { salaryInsightsByCountry: unknown } }).data.salaryInsightsByCountry).toMatchObject({
      minimumSalary: 125000,
      maximumSalary: 125000,
      averageSalary: 125000,
      employeeCount: 1
    });

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
