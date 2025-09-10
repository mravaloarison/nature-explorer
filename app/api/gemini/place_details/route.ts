
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { placeName } = await req.json();

    if (!placeName) {
      return NextResponse.json({ error: "placeName is required" }, { status: 400 });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Provide:
        1. A short paragraph describing the nature, ecosystems, and biodiversity of ${placeName}.
        2. A list of 5 of the most common wildlife species found there (realistic species).
        3. One interesting wildlife-related fun fact about the region.
        Focus ONLY on nature and ecology. Format following the schema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            mostCommonSpeciesFoundThere: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  scientificName: { type: Type.STRING },
                },
                propertyOrdering: ["id", "name", "scientificName"],
              },
            },
            wildlifeFunFact: { type: Type.STRING },
          },
          propertyOrdering: ["description", "mostCommonSpeciesFoundThere", "wildlifeFunFact"],
        },
      },
    });

    const json = JSON.parse(response.text ?? "{}");

    return NextResponse.json(json);
  } catch (error) {
    console.error("Gemini API error:", error);
    return NextResponse.json({ error: "Failed to fetch description" }, { status: 500 });
  }
}