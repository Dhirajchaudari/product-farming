import { authModule } from "./auth/index.js";

export interface ModuleDefinition {
  name: string;
}

export const modules: ModuleDefinition[] = [authModule];
