import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function sendWithTokenCount(userMessage: string) {
  console.log(`\n📨 User: "${userMessage}"`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as Anthropic.TextBlock).text)
    .join("");

  console.log(`🤖 Claude: "${text.slice(0, 120)}..."`);
  console.log("📊 Token usage:");
  console.log(`   input_tokens  : ${response.usage.input_tokens}`);
  console.log(`   output_tokens : ${response.usage.output_tokens}`);
  console.log(
    `   total         : ${response.usage.input_tokens + response.usage.output_tokens}`
  );

  return response.usage;
}

const messages = [
  "สวัสดี",
  "อธิบาย prompt caching ใน Anthropic API แบบสั้นๆ",
  "ขอบคุณ",
];

let totalInput = 0;
let totalOutput = 0;

for (const msg of messages) {
  const usage = await sendWithTokenCount(msg);
  totalInput += usage.input_tokens;
  totalOutput += usage.output_tokens;
}

console.log("\n============================");
console.log("📈 Token สรุปทั้ง session:");
console.log(`   input_tokens  : ${totalInput}`);
console.log(`   output_tokens : ${totalOutput}`);
console.log(`   รวมทั้งหมด    : ${totalInput + totalOutput}`);
