import { GeminiSummarizationProvider } from './gemini-summarization.provider';

describe('GeminiSummarizationProvider', () => {
  it('throws if GEMINI_API_KEY is not configured', () => {
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    expect(
      () => new GeminiSummarizationProvider(configService as never),
    ).toThrow('GEMINI_API_KEY is required');
  });
});
