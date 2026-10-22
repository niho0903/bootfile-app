export type HealthStatus = 'ready' | 'attention' | 'unavailable' | 'unverified';

export interface HealthCheck {
  id: string;
  label: string;
  status: HealthStatus;
  detail: string;
  variables?: Array<{ name: string; present: boolean }>;
}

export interface OperationsMetric {
  id: string;
  label: string;
  value: number | null;
  format: 'count' | 'currency';
  detail: string;
  period: '7 days' | 'current' | 'not measured';
}

export type DecisionCategory = 'reliability' | 'configuration' | 'product' | 'budget' | 'policy';
export type DecisionStatus = 'open' | 'acknowledged' | 'resolved';

export interface OperationsDecision {
  id: string;
  decision_key: string;
  category: DecisionCategory;
  severity: 'critical' | 'review';
  title: string;
  detail: string;
  recommended_action: string;
  evidence: Record<string, string | number | boolean | null>;
  status: DecisionStatus;
  owner_note: string | null;
  created_at: string;
  last_seen_at: string;
  resolved_at: string | null;
}

export interface OperationsRun {
  id: string;
  run_key: string;
  source: 'cron' | 'owner';
  status: 'running' | 'completed' | 'partial' | 'failed' | 'paused';
  started_at: string;
  finished_at: string | null;
  summary: Record<string, unknown>;
  error_code: string | null;
}

export interface OperationsPermission {
  task: string;
  authority: 'automatic' | 'owner decision' | 'not connected';
  boundary: string;
}

export interface OperationsSnapshot {
  generatedAt: string;
  since: string;
  metrics: OperationsMetric[];
  health: HealthCheck[];
  decisions: { available: boolean; error: string | null; items: OperationsDecision[] };
  runs: { available: boolean; error: string | null; items: OperationsRun[] };
  permissions: OperationsPermission[];
  policy: {
    paused: boolean;
    paidAcquisitionBudgetCents: 0;
    orderBatchLimit: number;
    dedupeWindowMinutes: number;
  };
  runtime: {
    environment: string;
    commit: string | null;
    deployment: string | null;
    lastCronInvocation: string | null;
    lastCompletedCronInvocation: string | null;
    scheduleEvidence: string;
  };
}
