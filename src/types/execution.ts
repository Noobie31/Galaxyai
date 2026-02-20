export interface Execution {
    id: string;
    workflowId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    results: any;
    startTime: Date;
    endTime?: Date;
}
