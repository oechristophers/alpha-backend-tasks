import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  CandidateSummaryInput,
  CandidateSummaryResult,
  RecommendedDecision,
  SummarizationProvider,
} from "./summarization-provider.interface";

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly logger = new Logger(GeminiSummarizationProvider.name);
  private readonly model;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is required when using the Gemini provider",
      );
    }

    // Default aligns with v1beta availability; override via GEMINI_MODEL when using other endpoints
    let modelName =
      this.configService.get<string>("GEMINI_MODEL") ?? "gemini-flash-latest";
    if (modelName.startsWith("gemini-1.5-flash")) {
      this.logger.warn(
        `Model ${modelName} is not available on v1beta; falling back to gemini-flash-latest`,
      );
      modelName = "gemini-flash-latest";
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: modelName });
  }

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    const prompt = this.buildPrompt(input);

    this.logger.log(
      `Calling Gemini for candidate ${input.candidateId} with ${input.documents.length} document(s)`,
    );

    const result = await this.model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return this.parseResponse(text);
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsSection =
      input.documents.length > 0
        ? input.documents
            .map((doc, i) => `--- Document ${i + 1} ---\n${doc}`)
            .join("\n\n")
        : "No documents provided.";

    return `You are an expert recruiter assistant. Analyze the following candidate documents and provide a structured evaluation.

Candidate ID: ${input.candidateId}

${documentsSection}

Respond ONLY with valid JSON in the following exact format (no markdown, no code fences, no extra text):
{
  "score": <number between 0 and 100>,
  "strengths": [<array of string observations>],
  "concerns": [<array of string observations>],
  "summary": "<brief paragraph summarizing the candidate>",
  "recommendedDecision": "<one of: advance, hold, reject>"
}

Rules:
- score must be an integer between 0 and 100
- strengths and concerns must each have at least one item
- recommendedDecision must be exactly one of: advance, hold, reject
- summary should be 2-4 sentences
- Be objective and professional`;
  }

  private parseResponse(text: string): CandidateSummaryResult {
    const cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Failed to parse Gemini response as JSON: ${cleaned.substring(0, 200)}`,
      );
    }

    const score = Number(parsed.score);
    if (!Number.isInteger(score) || score < 0 || score > 100) {
      throw new Error(`Invalid score from Gemini: ${parsed.score}`);
    }

    if (!Array.isArray(parsed.strengths) || parsed.strengths.length === 0) {
      throw new Error("Gemini returned invalid or empty strengths array");
    }

    if (!Array.isArray(parsed.concerns) || parsed.concerns.length === 0) {
      throw new Error("Gemini returned invalid or empty concerns array");
    }

    if (typeof parsed.summary !== "string" || parsed.summary.length === 0) {
      throw new Error("Gemini returned invalid or empty summary");
    }

    const validDecisions: RecommendedDecision[] = ["advance", "hold", "reject"];
    if (
      !validDecisions.includes(
        parsed.recommendedDecision as RecommendedDecision,
      )
    ) {
      throw new Error(
        `Invalid recommendedDecision from Gemini: ${parsed.recommendedDecision}`,
      );
    }

    return {
      score,
      strengths: parsed.strengths as string[],
      concerns: parsed.concerns as string[],
      summary: parsed.summary,
      recommendedDecision: parsed.recommendedDecision as RecommendedDecision,
    };
  }
}
