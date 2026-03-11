import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { FakeSummarizationProvider } from "./fake-summarization.provider";
import { GeminiSummarizationProvider } from "./gemini-summarization.provider";
import { SUMMARIZATION_PROVIDER } from "./summarization-provider.interface";

@Module({
  imports: [ConfigModule],
  providers: [
    FakeSummarizationProvider,
    {
      provide: SUMMARIZATION_PROVIDER,
      inject: [ConfigService, FakeSummarizationProvider],
      useFactory: (
        configService: ConfigService,
        fakeProvider: FakeSummarizationProvider,
      ) => {
        const useFake =
          configService.get<string>("USE_FAKE_SUMMARIZER") === "true";
        if (useFake) {
          return fakeProvider;
        }
        return new GeminiSummarizationProvider(configService);
      },
    },
  ],
  exports: [SUMMARIZATION_PROVIDER],
})
export class LlmModule {}
