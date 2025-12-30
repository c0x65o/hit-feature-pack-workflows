import type { NextRequest } from 'next/server';
export declare function actOnTask(request: NextRequest, opts: {
    action: 'approve' | 'deny';
}): Promise<{
    ok: boolean;
    status: number;
    body: any;
}>;
//# sourceMappingURL=_task-actions.d.ts.map