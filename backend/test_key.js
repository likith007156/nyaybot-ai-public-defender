import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

async function test() {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    try {
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("hi");
        const response = await result.response;
        console.log("SUCCESS:", response.text());
    } catch (err) {
        console.error("FAILURE:", err.message);
    }
}
test();
