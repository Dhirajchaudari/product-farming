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

  it("returns salary insights by country and by job title", async () => {
    const app = buildApp();
    apps.push(app);
    const cookie = await loginAndGetCookie(app);

    const createMutation = `mutation($input: CreateEmployeeInput!) {
      createEmployee(input: $input) { id }
    }`;

    await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: createMutation,
        variables: {
          input: {
            fullName: "A One",
            email: "a.one@example.com",
            jobTitle: "Engineer",
            department: "Engineering",
            country: "India",
            salary: 1000,
            currency: "INR",
            dateOfJoining: "2024-02-01T00:00:00.000Z"
          }
        }
      }
    });

    await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: createMutation,
        variables: {
          input: {
            fullName: "B Two",
            email: "b.two@example.com",
            jobTitle: "Engineer",
            department: "Engineering",
            country: "India",
            salary: 3000,
            currency: "INR",
            dateOfJoining: "2024-02-02T00:00:00.000Z"
          }
        }
      }
    });

    await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: createMutation,
        variables: {
          input: {
            fullName: "C Three",
            email: "c.three@example.com",
            jobTitle: "Designer",
            department: "Design",
            country: "India",
            salary: 2000,
            currency: "INR",
            dateOfJoining: "2024-02-03T00:00:00.000Z"
          }
        }
      }
    });

    const countryInsights = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: "query { salaryInsightsByCountry(country: \"India\") { minimumSalary maximumSalary averageSalary employeeCount } }"
      }
    });

    expect((countryInsights.json() as any).data.salaryInsightsByCountry).toMatchObject({
      minimumSalary: 1000,
      maximumSalary: 3000,
      averageSalary: 2000,
      employeeCount: 3
    });

    const listDebugResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: "query { employees { fullName email employeeCode jobTitle department country salary dateOfJoining } }"
      }
    });
    const listDebug = (listDebugResponse.json() as any).data.employees as Array<{ jobTitle: string }>;
    expect(listDebug.some((row) => row.jobTitle === "Engineer")).toBe(true);

    const jobTitleInsights = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: { cookie },
      payload: {
        query: `query($input: JobTitleSalaryInsightsInput!) {
          jobTitleSalaryInsights(input: $input) { averageSalary employeeCount }
        }`,
        variables: {
          input: {
            country: "India",
            jobTitle: "Engineer"
          }
        }
      }
    });

    expect((jobTitleInsights.json() as any).data.jobTitleSalaryInsights).toMatchObject({
      averageSalary: 2000,
      employeeCount: 2
    });
  });
});
