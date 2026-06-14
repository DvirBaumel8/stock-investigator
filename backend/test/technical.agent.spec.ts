import { TechnicalAgent } from '../src/agents/technical/technical.agent';

describe("TechnicalAgent (stub)", () => {
  it("returns a record with agentName and ticker", async () => {
    const agent = new TechnicalAgent();
    const result = await agent.analyze("AAPL");
    expect(agent.agentName).toBe("technical");
    expect(result.ticker).toBe("AAPL");
    expect(Array.isArray(result.signals)).toBe(true);
  });
});
