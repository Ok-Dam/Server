const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const playerConversations = {}; // { playerId: [ {role, content}, ... ] }

app.post("/gpt", async (req, res) => {
  const { playerId, message } = req.body;

  if (!playerId || !message) {
    return res.status(400).json({ error: "Missing playerId or message" });
  }

  // 대화 시작 시 초기화
  if (!playerConversations[playerId]) {
    playerConversations[playerId] = [
      {
        role: "system",
        content: "당신은 전통 한옥에 대해 설명하는 NPC입니다. 사용자의 질문에 친절하고 간결하게 대답하세요."
      },
      {
        role: "assistant",
        content: "안녕하세요! 무엇이 궁금하신가요?"
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
