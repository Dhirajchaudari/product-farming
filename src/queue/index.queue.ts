export interface QueueBootstrapResult {
  initialized: boolean;
}

export async function initializeQueues(): Promise<QueueBootstrapResult> {
  return {
    initialized: true
  };
}
