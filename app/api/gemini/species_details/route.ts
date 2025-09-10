import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const { scientificName } = await req.json();

        if (!scientificName) {
            return NextResponse.json({ error: "scientificName is required" }, { status: 400 });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a wildlife biology assistant. Given the scientific name "${scientificName}", return the following info in JSON format:
            
            1. A short paragraph (2-3 sentences) describing what the species looks like, where it's found, and what makes it unique.
            2. Its typical habitat and geographic range.
            3. Its diet (what it eats).
            4. Notable behaviors (e.g. social habits, migration, vocalizations, etc.).
            5. Its conservation status (e.g. endangered, least concern).
            6. One surprising or interesting fun fact about this species.

            If information is unknown, respond with "Unknown". Use simple, engaging language.`,
            
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        habitatAndRange: { type: Type.STRING },
                        diet: { type: Type.STRING },
                        behavior: { type: Type.STRING },
                        conservationStatus: { type: Type.STRING },
                        funFact: { type: Type.STRING },
                    },
                    propertyOrdering: [
                        "description",
                        "habitatAndRange",
                        "diet",
                        "behavior",
                        "conservationStatus",
                        "funFact"
                    ]
                },
            },
        });
        
        const json = JSON.parse(response.text ?? "{}");

        return NextResponse.json(json);
    } catch (error) {
        console.error("Error parsing request body:", error);
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
}