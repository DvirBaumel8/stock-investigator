export interface AgentInterface {
  readonly agentName: string;
  analyze(ticker: string): Promise<Record<string, unknown>>;
}
