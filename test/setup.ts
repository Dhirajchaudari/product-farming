import "reflect-metadata";

process.env.NODE_ENV = "test";

import { resetEnvConfigForTests } from "../src/utils/env.config.js";

resetEnvConfigForTests();
