import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface DiplomacyPayload {
  playerCountry: {
    nameFr: string;
    leaderTitle: string;
    leaderName: string;
    gdp: number;
    army: number;
    stability: number;
  };
  targetCountry: {
    nameFr: string;
    leaderTitle: string;
    leaderName: string;
    regime: string;
    personality: string;
    gdp: number;
    army: number;
    population: number;
    stability: number;
  };
  relation: number;
  isAtWar: boolean;
  isAllied: boolean;
  sameEconomicUnion: boolean;
  message: string;
}

function generateContextualFallbackReply(payload: DiplomacyPayload) {
  const { playerCountry, targetCountry, relation, isAtWar, isAllied, sameEconomicUnion, message } =
    payload;
  const lower = String(message).toLowerCase();
  const titleName = `${targetCountry.leaderTitle} ${targetCountry.leaderName}`;

  let relationDelta = 2;
  let action = "NONE";
  let treatyNote = "";
  let reply = "";

  const playerStronger = playerCountry.army >= targetCountry.army * 0.9;

  if (
    lower.includes("déclar") && lower.includes("guerre") ||
    lower.includes("insult") ||
    lower.includes("détrui")
  ) {
    relationDelta = -30;
    action = isAtWar ? "NONE" : "DECLARE_WAR";
    reply = `« Vos provocations franchissent une ligne rouge intolérable. ${targetCountry.nameFr} rompt les relations diplomatiques et mobilise immédiatement ses armées ! »`;
    treatyNote = `${targetCountry.nameFr} entre en guerre suite à une rupture diplomatique.`;
  } else if (isAtWar && (lower.includes("paix") || lower.includes("cessez") || lower.includes("trêve"))) {
    if (relation > -65 || playerStronger || targetCountry.personality === "Pacifiste") {
      action = "ACCEPT_PEACE";
      relationDelta = 18;
      reply = `« Les peuples méritent la fin de ces hostilités. Au nom de ${targetCountry.nameFr}, j'accepte de signer un cessez-le-feu immédiat avec ${playerCountry.nameFr}. »`;
      treatyNote = `${targetCountry.nameFr} et ${playerCountry.nameFr} conviennent d'un cessez-le-feu.`;
    } else {
      action = "REJECT_PEACE";
      relationDelta = -4;
      reply = `« Vos conditions ne reflètent pas la réalité du terrain. ${targetCountry.nameFr} poursuivra les opérations tant que nos intérêts ne seront pas garantis. »`;
    }
  } else if (lower.includes("alliance") || lower.includes("défens") || lower.includes("pacte militaire")) {
    if (isAtWar) {
      action = "REJECT_ALLIANCE";
      reply = `« Aucune alliance ne peut être envisagée alors que nos nations s'affrontent militairement. »`;
    } else if (isAllied) {
      relationDelta = 4;
      reply = `« Notre alliance stratégique demeure solide, et ${targetCountry.nameFr} honore pleinement ses engagements envers ${playerCountry.nameFr}. »`;
    } else if (relation >= 35 || (relation >= 15 && playerStronger && targetCountry.personality !== "Expansionniste")) {
      action = "ACCEPT_ALLIANCE";
      relationDelta = 14;
      reply = `« Nos chancelleries partagent une vision commune de la sécurité régionale. ${targetCountry.nameFr} accepte de sceller une alliance officielle avec ${playerCountry.nameFr}. »`;
      treatyNote = `${targetCountry.nameFr} conclut une alliance avec ${playerCountry.nameFr}.`;
    } else {
      action = "REJECT_ALLIANCE";
      relationDelta = -2;
      reply = `« Bien que nous soyons attentifs à votre proposition, la confiance diplomatique reste insuffisante pour lier nos armées par un traité de défense. »`;
    }
  } else if (
    lower.includes("union") ||
    lower.includes("économ") ||
    lower.includes("commerc") ||
    lower.includes("libre-échange") ||
    lower.includes("industrie")
  ) {
    if (isAtWar) {
      action = "REJECT_ECONOMIC_UNION";
      reply = `« Les échanges économiques sont suspendus tant que dure l'état de guerre. »`;
    } else if (sameEconomicUnion) {
      relationDelta = 5;
      reply = `« Notre appartenance commune à l'union économique porte déjà ses fruits pour la prospérité de ${targetCountry.nameFr} et de ${playerCountry.nameFr}. »`;
    } else if (relation >= 18 || (targetCountry.personality === "Mercantile" && relation >= 0)) {
      action = "ACCEPT_ECONOMIC_UNION";
      relationDelta = 12;
      reply = `« Le développement de nos échanges commerciaux et industriels est une priorité pour ${targetCountry.nameFr}. J'accepte votre proposition d'union économique. »`;
      treatyNote = `${targetCountry.nameFr} et ${playerCountry.nameFr} s'unissent économiquement.`;
    } else {
      action = "REJECT_ECONOMIC_UNION";
      reply = `« Les divergences réglementaires et politiques entre nos deux pays ne permettent pas encore une intégration économique. »`;
    }
  } else if (lower.includes("non-agression") || lower.includes("non agression")) {
    if (!isAtWar && relation >= -15) {
      action = "PROPOSE_NON_AGGRESSION";
      relationDelta = 8;
      reply = `« ${targetCountry.nameFr} accueille favorablement cet engagement de stabilité et ratifie un pacte de non-agression avec ${playerCountry.nameFr}. »`;
    } else {
      reply = `« Les tensions actuelles ne nous permettent pas de signer un tel pacte pour le moment. »`;
    }
  } else if (lower.includes("menace") || lower.includes("ultimatum") || lower.includes("retrait")) {
    relationDelta = -16;
    reply = `« ${titleName} rejette fermement toute tentative d'intimidation. ${targetCountry.nameFr} défendra sa souveraineté sans faillir. »`;
  } else if (lower.includes("bonjour") || lower.includes("amitié") || lower.includes("coopér") || lower.includes("salut")) {
    relationDelta = 6;
    reply = `« ${titleName} vous adresse ses salutations depuis ${targetCountry.nameFr}. Nous sommes disposés à approfondir le dialogue constructif avec ${playerCountry.nameFr}. »`;
  } else {
    relationDelta = relation >= 0 ? 3 : -2;
    reply = `« ${titleName} de ${targetCountry.nameFr} a pris bonne note de votre dépêche. Notre gouvernement (${targetCountry.personality.toLowerCase()}) évaluera la suite à donner selon nos intérêts nationaux. »`;
  }

  return {
    reply,
    relationDelta,
    action,
    treatyNote,
    usedAi: false,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Diplomatic chat endpoint powered by Gemini with seamless heuristic fallback
  app.post("/api/diplomacy/message", async (req, res) => {
    const payload = req.body as DiplomacyPayload & {
      history?: Array<{ sender: string; text: string }>;
      currentDateLabel?: string;
    };

    if (!payload?.playerCountry || !payload?.targetCountry || !payload?.message) {
      return res.status(400).json({ error: "Paramètres diplomatiques incomplets." });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.json(generateContextualFallbackReply(payload));
    }

    try {
      const {
        playerCountry,
        targetCountry,
        relation,
        isAtWar,
        isAllied,
        sameEconomicUnion,
        message,
        history,
        currentDateLabel,
      } = payload;

      const formattedHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((h) => `${h.sender}: ${h.text}`)
            .join("\n")
        : "";

      const systemInstruction = `Tu incarnes ${targetCountry.leaderTitle} ${targetCountry.leaderName}, dirigeant souverain de ${targetCountry.nameFr}.
Date actuelle : ${currentDateLabel || "Novembre 2026"}.
Régime : ${targetCountry.regime}. Personnalité diplomatique : ${targetCountry.personality}.
Puissance de ton pays (${targetCountry.nameFr}) : PIB ${targetCountry.gdp} Mds $, Armée ${targetCountry.army}k soldats, Population ${targetCountry.population}M, Stabilité ${targetCountry.stability}%.
Interlocuteur : ${playerCountry.leaderTitle} ${playerCountry.leaderName} de ${playerCountry.nameFr} (PIB ${playerCountry.gdp} Mds $, Armée ${playerCountry.army}k soldats, Stabilité ${playerCountry.stability}%).
État des relations actuelles : Score ${relation}/100. En guerre : ${isAtWar ? "OUI" : "NON"}. Alliés militaires : ${isAllied ? "OUI" : "NON"}. Même union économique : ${sameEconomicUnion ? "OUI" : "NON"}.

Règles strictes :
1. Réponds TOUJOURS en français soutenu, réaliste et immersif (style dépêche diplomatique / chef d'État, 2 à 4 phrases maximum).
2. Prends des décisions rationnelles selon ton rapport de force, ta personnalité (${targetCountry.personality}) et la relation (${relation}/100).
3. Choisis une "action" concrète parmi :
   - "NONE"
   - "ACCEPT_ALLIANCE" / "REJECT_ALLIANCE"
   - "ACCEPT_ECONOMIC_UNION" / "REJECT_ECONOMIC_UNION"
   - "ACCEPT_PEACE" / "REJECT_PEACE"
   - "DECLARE_WAR"
   - "PROPOSE_NON_AGGRESSION"
4. "relationDelta" doit être un entier entre -30 et +25 cohérent avec le ton du message.`;

      const prompt = formattedHistory
        ? `Historique récent de la correspondance :\n${formattedHistory}\n\nNouveau message reçu de ${playerCountry.nameFr} :\n"${message}"`
        : `Nouveau message reçu de ${playerCountry.nameFr} :\n"${message}"`;

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              relationDelta: { type: Type.INTEGER },
              action: { type: Type.STRING },
              treatyNote: { type: Type.STRING },
            },
            required: ["reply", "relationDelta", "action", "treatyNote"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());

      return res.json({
        reply: parsed.reply || "Nous prenons bonne note de votre message.",
        relationDelta: Math.max(-35, Math.min(30, Number(parsed.relationDelta) || 0)),
        action: parsed.action || "NONE",
        treatyNote: parsed.treatyNote || "",
        usedAi: true,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn("Gemini diplomacy fallback triggered:", errMsg);
      return res.json(generateContextualFallbackReply(payload));
    }
  });

  // Geopolitical summit / crisis generator endpoint with fallback pool
  app.post("/api/simulation/crisis", async (req, res) => {
    const { playerCountry, topPowers, currentDateLabel, activeWarsCount } = req.body;
    const ai = getAiClient();

    if (ai) {
      try {
        const prompt = `Date: ${currentDateLabel}. Nation dirigée par le joueur : ${playerCountry.nameFr} (PIB ${playerCountry.gdp} Mds $, Stabilité ${playerCountry.stability}%).
Grandes puissances actuelles : ${topPowers.map((p: { nameFr: string; gdp: number }) => `${p.nameFr} (${p.gdp} Mds $)`).join(", ")}.
Nombre de guerres en cours : ${activeWarsCount}.
Génère UN événement géopolitique mondial marquant et réaliste en français avec 2 choix de décision pour le joueur.`;

        const response = await ai.models.generateContent({
          model: "gemini-4-hydrogen",
          contents: prompt,
          config: {
            systemInstruction:
              "Tu es le moteur narratif d'un jeu de grande stratégie géopolitique réaliste. Génère des crises diplomatiques, sommets économiques ou incidents frontaliers crédibles en français.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                optionALabel: { type: Type.STRING },
                optionATreasuryDelta: { type: Type.INTEGER },
                optionAStabilityDelta: { type: Type.INTEGER },
                optionAGdpPctDelta: { type: Type.NUMBER },
                optionBLabel: { type: Type.STRING },
                optionBTreasuryDelta: { type: Type.INTEGER },
                optionBStabilityDelta: { type: Type.INTEGER },
                optionBGdpPctDelta: { type: Type.NUMBER },
              },
              required: [
                "title",
                "description",
                "optionALabel",
                "optionATreasuryDelta",
                "optionAStabilityDelta",
                "optionAGdpPctDelta",
                "optionBLabel",
                "optionBTreasuryDelta",
                "optionBStabilityDelta",
                "optionBGdpPctDelta",
              ],
            },
          },
        });

        const parsed = JSON.parse((response.text ?? "{}").trim());
        return res.json({ usedAi: true, event: parsed });
      } catch (error: unknown) {
        console.warn("Gemini crisis fallback triggered:", error);
      }
    }

    const fallbackCrises = [
      {
        title: "Sommet énergétique et commercial international",
        description:
          "Une hausse soudaine du fret maritime fragilise les chaînes d’approvisionnement. Votre gouvernement doit arbitrer sa réponse économique.",
        optionALabel: "Subventionner l’industrie et sécuriser les routes commerciales",
        optionATreasuryDelta: -10,
        optionAStabilityDelta: 5,
        optionAGdpPctDelta: 1.5,
        optionBLabel: "Maintenir la rigueur budgétaire et taxer les importations",
        optionBTreasuryDelta: 8,
        optionBStabilityDelta: -4,
        optionBGdpPctDelta: -0.4,
      },
      {
        title: "Forum de défense et souveraineté technologique",
        description:
          "Plusieurs consortiums proposent d'implanter des centres stratégiques de semi-conducteurs et de défense sur votre territoire.",
        optionALabel: "Cofinancer un pôle industriel souverain",
        optionATreasuryDelta: -14,
        optionAStabilityDelta: 4,
        optionAGdpPctDelta: 2.1,
        optionBLabel: "Privilégier la réduction de la dette publique",
        optionBTreasuryDelta: 10,
        optionBStabilityDelta: -2,
        optionBGdpPctDelta: 0.2,
      },
      {
        title: "Mouvement social sur le pouvoir d’achat",
        description:
          "Des syndicats et collectivités réclament un plan d’urgence face à l’inflation des biens essentiels.",
        optionALabel: "Débloquer une aide sociale exceptionnelle",
        optionATreasuryDelta: -8,
        optionAStabilityDelta: 8,
        optionAGdpPctDelta: 0.5,
        optionBLabel: "Refuser toute dépense supplémentaire",
        optionBTreasuryDelta: 3,
        optionBStabilityDelta: -7,
        optionBGdpPctDelta: 0.1,
      },
    ];

    const pick = fallbackCrises[Math.floor(Math.random() * fallbackCrises.length)];
    return res.json({ usedAi: false, event: pick });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Orbis Diplomatica server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
