import { authModule } from "./auth/index.js";
import { employeeModule } from "./employee/index.js";

export interface ModuleDefinition {
  name: string;
}

export const modules: ModuleDefinition[] = [authModule, employeeModule];
