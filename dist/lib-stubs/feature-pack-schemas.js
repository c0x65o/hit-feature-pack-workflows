/**
 * Stub for @/lib/feature-pack-schemas
 *
 * This is a type-only stub for feature pack compilation.
 * At runtime, the consuming application provides the actual implementation
 * via the generated lib/feature-pack-schemas.ts file.
 */
// Re-export from the actual schema file for type checking during build
export { principalTypeEnum, workflows, workflowVersions, workflowAcls, workflowRuns, workflowRunEvents, workflowTasks, WORKFLOW_PERMISSIONS, } from '../schema/workflows';
