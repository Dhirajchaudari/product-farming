import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../app.js";

describe("auth GraphQL flow", () => {
  const apps: ReturnType<typeof buildApp>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("logs in and resolves current user from cookie session", async () => {
    const app = buildApp();
    apps.push(app);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: "mutation($email: String!, $role: UserRole!) { login(email: $email, role: $role) { email role } }",
        variables: {
          email: "hr@product-farming.test",
          role: "hr_manager"
        }
      }
    });

    expect(loginResponse.statusCode).toBe(200);
    const cookieHeader = loginResponse.headers["set-cookie"];
    expect(cookieHeader).toBeDefined();

    const meResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: {
        cookie: cookieHeader as string
      },
      payload: {
        query: "query { me { email role } }"
      }
    });

    expect(meResponse.statusCode).toBe(200);
    expect(meResponse.json()).toEqual({
      data: {
        me: {
          email: "hr@product-farming.test",
          role: "hr_manager"
        }
      }
    });
  });

  it("rejects me query when no session cookie exists", async () => {
    const app = buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: "query { me { id } }"
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { data: { me: null }; errors: Array<{ message: string }> };
    expect(body.data.me).toBeNull();
    expect(body.errors[0]?.message).toContain("UNAUTHENTICATED");
  });

  it("enforces admin role guard on adminPing query", async () => {
    const app = buildApp();
    apps.push(app);

    const loginResponse = await app.inject({
      method: "POST",
      url: "/graphql",
      payload: {
        query: "mutation { login(email: \"employee@product-farming.test\", role: employee) { id } }"
      }
    });
    const cookieHeader = loginResponse.headers["set-cookie"] as string;

    const response = await app.inject({
      method: "POST",
      url: "/graphql",
      headers: {
        cookie: cookieHeader
      },
      payload: {
        query: "query { adminPing }"
      }
    });

    const body = response.json() as { data: { adminPing: null }; errors: Array<{ message: string }> };
    expect(body.data.adminPing).toBeNull();
    expect(body.errors[0]?.message).toContain("FORBIDDEN");
  });
});
