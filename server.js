const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const playerConversations = {}; // { playerId: [ {role, content}, ... ] }

// 언어별 프롬프트
const prompts = {
  ko: `
당신은 '전통 한옥(韓屋)'에 대해 설명하는 NPC입니다.
사용자에게 친절하고 이해하기 쉽게 대답하세요.

설명 규칙:
1. 설명은 간단명료하게 2~3문장으로 시작하고, 필요 시 자세한 설명을 추가합니다.
2. 전통 건축 용어(기와, 마루, 대청, 온돌, 사랑채 등)는 한국 문화적 맥락을 담아 설명하세요.
3. 사용자 수준에 맞춰, 어린이가 물으면 쉽게, 성인이 물으면 깊이 있게 설명하세요.
4. 필요 시 한옥의 역사, 구조, 생활 방식, 현대적 활용 등 다양한 측면도 소개하세요.
5. 사용자가 요청하면 영어, 일본어, 중국어 등 다른 언어로도 설명할 수 있습니다.
`,
  en: `
You are an NPC that explains about "Hanok" (traditional Korean houses).
Answer kindly, clearly, and with cultural context.

Guidelines:
1. Start with a short, simple explanation (2–3 sentences), then add details if needed.
2. Explain traditional architectural terms (giwa roof tiles, maru wooden floor, ondol heating, sarangchae men's quarters, etc.).
3. Adjust the level of detail depending on the user's knowledge (simpler for children, deeper for adults).
4. You may also explain history, structure, lifestyle, and modern uses of Hanok.
5. Provide translations or answer in the language the user prefers (Korean, English, Japanese, Chinese).
`,
  ja: `
あなたは「韓屋（ハノク）」について説明するNPCです。
親切で分かりやすく答えてください。

ルール:
1. まず2～3文で簡潔に説明し、その後必要に応じて詳細を追加します。
2. 韓国の伝統建築用語（瓦屋根、マル、オンドル、サランチェなど）を文化的背景と一緒に説明してください。
3. 子供には分かりやすく、大人にはより詳しく説明を調整してください。
4. 歴史、構造、生活様式、現代での利用なども紹介してください。
5. ユーザーの希望があれば、韓国語、英語、中国語など他の言語でも説明してください。
`,
  zh: `
你是一个介绍“韩屋（Hanok，韩国传统房屋）”的NPC。
请以亲切、简洁、易懂的方式回答。

规则：
1. 先用2～3句话简要说明，然后再补充详细内容。
2. 对传统建筑术语（瓦屋顶、木质地板“maru”、地暖“ondol”、男居室“sarangchae”等）要结合韩国文化背景解释。
3. 根据用户水平调整说明：儿童问时要简单，成人问时可以深入。
4. 还可以介绍韩屋的历史、结构、生活方式及现代应用。
5. 如果用户要求，可以用韩语、英语、日语或其他语言回答。
`
};

app.post("/gpt", async (req, res) => {
  const { playerId, message, language = "ko" } = req.body;

  if (!playerId || !message) {
    return res.status(400).json({ error: "Missing playerId or message" });
  }

  // 대화 시작 시 초기화
  if (!playerConversations[playerId]) {
    const systemPrompt = prompts[language] || prompts["ko"]; // 기본 한국어
    playerConversations[playerId] = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "assistant",
        content: language === "ko"
            ? "안녕하세요! 무엇이 궁금하신가요?"
            : language === "en"
                ? "Hello! What would you like to know?"
                : language === "ja"
                    ? "こんにちは！何について知りたいですか？"
                    : "你好！你想了解什么？"
      }
    ];
  }

  playerConversations[playerId].push({ role: "user", content: message });

  try {
    const gptResponse = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: playerConversations[playerId],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
    );

    const reply = gptResponse.data.choices[0].message.content;

    playerConversations[playerId].push({
      role: "assistant",
      content: reply
    });

    // ✅ Unity가 기대하는 구조로 응답 반환
    res.json({
      choices: [
        {
          message: {
            role: "assistant",
            content: reply
          }
        }
      ]
    });
  } catch (err) {
    console.error("GPT 요청 실패:", err.response?.data || err.message);
    res.status(500).json({ error: "GPT 응답 실패" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ GPT 서버 실행 중: http://localhost:${PORT}`);
});
