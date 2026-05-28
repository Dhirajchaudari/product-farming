import { describe, expect, it } from "vitest";

import { authModule } from "../index.js";
import { AuthService } from "../services/auth.service.js";

describe("auth module scaffold", () => {
  it("registers auth module metadata", () => {
    expect(authModule.name).toBe("auth");
  });

  it("creates and resolves a session user", async () => {
    const authService = new AuthService();
    const session = await authService.createSession("hr@product-farming.test", "hr_manager");
    const user = await authService.resolveSession(session.sessionId);

    expect(user?.email).toBe("hr@product-farming.test");
    expect(user?.role).toBe("hr_manager");
  });
});
