import { Module } from "@nestjs/common";
import { NewsSentimentAgent } from "./news-sentiment.agent";

@Module({
  providers: [NewsSentimentAgent],
  exports: [NewsSentimentAgent],
})
export class NewsSentimentModule {}
