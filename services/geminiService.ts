import { GoogleGenAI } from "@google/genai";
import { Player, RaceSettings } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const generateRaceCommentary = async (
  p1: Player,
  p2: Player,
  settings: RaceSettings,
  context?: string // Optional context (e.g., "Finał turnieju")
): Promise<string> => {
  const client = getClient();
  if (!client) {
    return "Brak klucza API. Skonfiguruj klucz, aby otrzymać komentarz AI.";
  }

  const winner = p1.finishTime && p2.finishTime 
    ? (p1.finishTime < p2.finishTime ? p1 : p2) 
    : (p1.finished ? p1 : p2);
  
  const loser = winner.id === 1 ? p2 : p1;

  const prompt = `
    Jesteś niesamowicie energicznym, polskim komentatorem sportowym na zawodach Gold Sprint (wyścigi na rowerach stacjonarnych).
    ${context ? `WAŻNE: To jest ${context}!` : ''}
    Właśnie zakończył się wyścig na dystansie ${settings.targetDistance} metrów.
    
    Zwycięzca: ${winner.name} (Czas: ${winner.finishTime?.toFixed(2)}s, Średnia prędkość: ${(winner.distance / (winner.finishTime || 1) * 3.6).toFixed(1)} km/h)
    Drugie miejsce: ${loser.name} (Czas: ${loser.finishTime ? loser.finishTime.toFixed(2) + 's' : 'Nie ukończył'}, Dystans: ${loser.distance.toFixed(0)}m)
    
    Napisz krótki, 3-zdanioowy, pełen emocji komentarz podsumowujący ten pojedynek. Używaj wykrzykników i sportowego żargonu.
    Jeśli to finał, bądź ultra-dramatyczny.
    Jeśli różnica czasu była mała (< 1s), podkreśl jak zacięta była walka. Jeśli duża, pochwal dominację zwycięzcy.
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Nie udało się wygenerować komentarza.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Wystąpił błąd podczas łączenia z komentatorem AI.";
  }
};

export const generateSetupQuestions = async (): Promise<string[]> => {
    const client = getClient();
    if (!client) return ["Upewnij się, że masz klucz API."];

    const prompt = `
      Jesteś ekspertem od organizowania eventów rowerowych Gold Sprint. 
      Użytkownik chce stworzyć aplikację lub skonfigurować wyścig.
      Zadaj 3 kluczowe pytania, które pomogą dopasować ustawienia wyścigu do poziomu uczestników (np. amatorzy vs pro, impreza firmowa vs zawody).
      Zwróć tylko pytania w formacie listy JSON.
    `;

    try {
        const response = await client.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        const text = response.text;
        if (!text) return ["Błąd generowania pytań."];
        // Clean markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr) as string[];
    } catch (e) {
        return ["Czy to wyścig dla profesjonalistów?", "Jaki dystans preferujesz?", "Jaki typ wizualizacji wolisz?"];
    }
}
