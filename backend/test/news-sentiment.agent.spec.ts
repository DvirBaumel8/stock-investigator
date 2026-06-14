import { NewsSentimentAgent } from "../src/agents/news-sentiment/news-sentiment.agent";

describe("NewsSentimentAgent (stub)", () => {
  it("returns a record with agentName and ticker", async () => {
    const agent = new NewsSentimentAgent();
    const result = await agent.analyze("AAPL");
    expect(agent.agentName).toBe("news_sentiment");
    expect(result.ticker).toBe("AAPL");
    expect(Array.isArray(result.topHeadlines)).toBe(true);
  });
});
