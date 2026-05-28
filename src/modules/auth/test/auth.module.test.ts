import { describe, expect, it } from "vitest";

import { authModule } from "../index.js";
import { AuthService } from "../services/auth.service.js";

describe("auth module scaffold", () => {
  it("registers auth module metadata", () => {
    expect(authModule.name).toBe("auth");
  });

  it("creates a default session user shape", () => {
    const authService = new AuthService();
    const user = authService.buildSessionUser("hr@product-farming.test");

    expect(user.email).toBe("hr@product-farming.test");
    expect(user.role).toBe("hr_manager");
  });
});
