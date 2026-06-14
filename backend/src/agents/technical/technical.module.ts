import { Module } from "@nestjs/common";
import { TechnicalAgent } from "./technical.agent";

@Module({
  providers: [TechnicalAgent],
  exports: [TechnicalAgent],
})
export class TechnicalModule {}
