const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// Enhanced helper function to clean JSON response from markdown code blocks
function cleanJsonResponse(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code blocks if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }

  cleaned = cleaned.trim();

  // Use regex to extract JSON object or array more reliably
  const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonArrayMatch = cleaned.match(/\[[\s\S]*\]/);

  let extractedJson = cleaned;

  if (
    jsonArrayMatch &&
    (!jsonObjectMatch || jsonArrayMatch.index! < jsonObjectMatch.index!)
  ) {
    extractedJson = jsonArrayMatch[0];
  } else if (jsonObjectMatch) {
    extractedJson = jsonObjectMatch[0];
  } else {
    // Fallback to original logic if regex doesn't find anything
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      extractedJson = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      // Handle array responses
      const firstBracket = cleaned.indexOf("[");
      const lastBracket = cleaned.lastIndexOf("]");

      if (
        firstBracket !== -1 &&
        lastBracket !== -1 &&
        lastBracket > firstBracket
      ) {
        extractedJson = cleaned.substring(firstBracket, lastBracket + 1);
      }
    }
  }

  return extractedJson;
}

async function makeGeminiRequest(
  prompt: string,
  timeout: number = 15000
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    if (!GEMINI_API_KEY) {
      throw new Error(
        "Gemini API key is not configured. Please check your environment variables."
      );
    }

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        throw new Error(
          "API rate limit exceeded. Please try again in a few minutes."
        );
      } else if (response.status === 401) {
        throw new Error(
          "Invalid API key. Please check your Gemini API configuration."
        );
      } else if (response.status >= 500) {
        throw new Error(
          "AI service is temporarily unavailable. Please try again later."
        );
      }
      throw new Error(`AI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      throw new Error("Invalid response from AI service. Please try again.");
    }

    const content = data.candidates[0].content.parts[0].text;
    const cleanedContent = cleanJsonResponse(content);

    if (
      !cleanedContent ||
      (!cleanedContent.startsWith("[") && !cleanedContent.startsWith("{"))
    ) {
      throw new Error("AI returned invalid data format. Please try again.");
    }

    try {
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Cleaned content:", cleanedContent);
      throw new Error("Failed to process AI response. Please try again.");
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(
        "Request timeout - the AI service is taking too long to respond. Please try again."
      );
    }

    // Network errors
    if (error.message.includes("fetch")) {
      throw new Error(
        "Network connection error. Please check your internet connection and try again."
      );
    }

    throw error;
  }
}

export async function generateQuestions(goal: string): Promise<any[]> {
  try {
    console.log("Generating questions for goal:", goal);

    const prompt = `Generate 5 specific questions to understand the user's learning needs for: ${goal}

Return ONLY a JSON array with this exact format:
[
  {
    "question": "What is your current experience level?",
    "options": ["Beginner", "Intermediate", "Advanced"]
  }
]

No explanations, no markdown, just the JSON array.`;

    const questions = await makeGeminiRequest(prompt, 20000);
    console.log("Parsed questions:", questions);

    if (!Array.isArray(questions)) {
      throw new Error("Invalid questions format received from AI");
    }

    return questions;
  } catch (error: any) {
    console.error("Error generating questions:", error);
    throw new Error(
      error.message || "Failed to generate questions - please try again"
    );
  }
}

export async function generateRoadmap(
  goal: string,
  answers: any
): Promise<any> {
  try {
    console.log("Generating roadmap for goal:", goal);
    console.log("User answers:", answers);

    const formattedAnswers = Object.entries(answers)
      .map(([question, answer]) => `${question}: ${answer}`)
      .join("\n");

    const prompt = `Create a detailed 8-week learning roadmap for: ${goal}

User answers:
${formattedAnswers}

Return ONLY a JSON array of weeks with this exact format:
[
  {
    "title": "Week 1: Foundation",
    "topics": [
      {
        "title": "Topic Name",
        "lessonObjective": "What you'll learn",
        "estimatedTime": "2 hours"
      }
    ]
  }
]

No explanations, no markdown, just the JSON array.`;

    const roadmapWeeks = await makeGeminiRequest(prompt, 30000);
    console.log("Parsed roadmap weeks:", roadmapWeeks);

    // Validate the roadmap structure
    if (!Array.isArray(roadmapWeeks)) {
      throw new Error("Invalid roadmap format received from AI");
    }

    return roadmapWeeks;
  } catch (error: any) {
    console.error("Error generating roadmap:", error);
    throw new Error(
      error.message || "Failed to generate roadmap - please try again"
    );
  }
}

export async function generateLessonContent(lesson: any): Promise<any> {
  try {
    const prompt = `Create comprehensive lesson content for:
Title: ${lesson.title}
Objective: ${lesson.lessonObjective}
Time: ${lesson.estimatedTime}

Return ONLY this JSON format with enhanced interactive features:
{
  "title": "${lesson.title}",
  "lessonObjective": "${lesson.lessonObjective}",
  "estimatedTime": "${lesson.estimatedTime}",
  "lessonContent": "Detailed explanation in 4-5 paragraphs with step-by-step breakdown",
  "keyConcepts": ["concept1", "concept2", "concept3", "concept4"],
  "exampleCode": [
    {
      "description": "Example description with syntax highlighting",
      "code": "well-formatted code with proper indentation",
      "output": "expected output or result"
    }
  ],
  "interactiveElements": [
    {
      "type": "playground",
      "title": "Interactive Playground",
      "description": "Try experimenting with the concepts",
      "content": {}
    },
    {
      "type": "demo",
      "title": "Visual Demo",
      "description": "See how changes affect outcomes",
      "content": {}
    }
  ],
  "assessmentQuestions": [
    {
      "question": "Question text?",
      "type": "multiple-choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Option A",
      "explanation": "Detailed explanation of why this is correct"
    },
    {
      "question": "Open-ended question?",
      "type": "open-ended",
      "answer": "Expected answer or key points",
      "explanation": "What to look for in the answer"
    }
  ]
}

Include:
- Interactive visual diagrams explanations
- Live input-output playgrounds for experimentation
- Dynamic element manipulation demos
- Syntax-highlighted code blocks
- Chapter-based quizzes with both multiple-choice and open-ended questions
- Instant feedback with detailed explanations

No explanations, no markdown, just the JSON object.`;

    const lessonContent = await makeGeminiRequest(prompt, 25000);

    if (!lessonContent || typeof lessonContent !== "object") {
      throw new Error("Invalid lesson content format received from AI");
    }

    return lessonContent;
  } catch (error: any) {
    console.error("Error generating lesson content:", error);
    throw new Error(
      error.message || "Failed to generate lesson content - please try again"
    );
  }
}
