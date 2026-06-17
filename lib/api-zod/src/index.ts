export * from "./generated/api";
// `generated/api` (zod mode) already exports a schema value *and* an inferred
// type for each model, several of which share names with `generated/types`.
// Expose the standalone DTO types under a namespace to avoid duplicate-export
// ambiguity (TS2308) while keeping them reachable (e.g. `Types.Agent`).
export * as Types from "./generated/types";
