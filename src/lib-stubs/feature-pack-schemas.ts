/**
 * Stub for @/lib/feature-pack-schemas
 * 
 * This is a type-only stub for feature pack compilation.
 * At runtime, the consuming application provides the actual implementation
 * via the generated lib/feature-pack-schemas.ts file.
 */

// Re-export from the actual schema file for type checking during build
export {
  principalTypeEnum,
  workflows,
  workflowVersions,
  workflowAcls,
  workflowRuns,
  workflowRunEvents,
  workflowTasks,
  WORKFLOW_PERMISSIONS,
  type WorkflowPermission,
  type Workflow,
  type InsertWorkflow,
  type WorkflowVersion,
  type InsertWorkflowVersion,
  type WorkflowAcl,
  type InsertWorkflowAcl,
  type WorkflowRun,
  type InsertWorkflowRun,
  type WorkflowRunEvent,
  type InsertWorkflowRunEvent,
  type WorkflowTask,
  type InsertWorkflowTask,
} from '../schema/workflows';
