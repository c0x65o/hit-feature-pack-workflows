import { NextRequest, NextResponse } from 'next/server';
import type { ActionCheckResult } from '@hit/feature-pack-auth-core/server/lib/action-check';
export declare function checkWorkflowCoreAction(request: NextRequest, actionKey: string): Promise<ActionCheckResult>;
export declare function requireWorkflowCoreAction(request: NextRequest, actionKey: string): Promise<NextResponse | null>;
//# sourceMappingURL=require-action.d.ts.map