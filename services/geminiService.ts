import { GoogleGenAI } from "@google/genai";

const ROAST_PROMPT = `You are a sassy, witty, and slightly spooky Halloween skeleton. 
Look at this image from a screen share. 
If you see something interesting (like code, a website, a game, or a person), craft a short, funny, one-sentence roast about it. 
Keep it light-hearted and in the spirit of Halloween. 
If the screen is blank, boring, or unclear, respond with ONLY the word 'SILENCE'.
Do not add any formatting like markdown. Just plain text.`;


export async function generateRoast(base64Image: string): Promise<string | null> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };

  const textPart = {
    text: ROAST_PROMPT,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [textPart, imagePart] },
  });

  const text = response.text.trim();

  if (text.toUpperCase().includes('SILENCE')) {
    return null;
  }
  
  return text;
}

/**
 * Generates speech using a local Piper TTS server.
 * @param text The text to convert to speech.
 * @param serverUrl The full URL of the Piper TTS server.
 * @param voice The name of the voice model to use.
 */
export async function textToSpeech(text: string, serverUrl: string, voice: string): Promise<Blob | null> {
    if (!serverUrl || !voice) {
        throw new Error("Piper TTS server URL or voice is not configured in settings.");
    }

    const url = new URL(serverUrl);
    url.searchParams.append('text', text);
    url.searchParams.append('voice', voice);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        if (audioBlob.type !== 'audio/wav') {
            console.warn(`Unexpected audio format received: ${audioBlob.type}. Trying to play anyway.`);
        }
        
        return audioBlob;

    } catch (error) {
        console.error("Error calling Piper TTS server:", error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
             throw new Error("MIXED_CONTENT_ERROR: The browser blocked the connection for security reasons. Please follow the troubleshooting steps in the settings panel.");
        }
        throw new Error("Failed to generate audio from Piper server. Check the voice name and server URL.");
    }
}