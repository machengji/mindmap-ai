import OpenAI from 'openai';

let apiKey = localStorage.getItem('deepseek_api_key') || '';

export function setApiKey(key: string) {
    apiKey = key;
    localStorage.setItem('deepseek_api_key', key);
}

export function getApiKey() {
    return apiKey;
}

export async function fetchAIExpansion(parentText: string): Promise<string[]> {
    if (!apiKey) {
        throw new Error('请先设置 DeepSeek API Key');
    }

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com',
        dangerouslyAllowBrowser: true // 客户端调用需要开启
    });

    const systemPrompt = `
你是一个思维导图助手。用户会提供一个【父节点】的内容，请你将其分解为 3-5 个具体的【子节点】。
请严格以 JSON 格式输出。

EXAMPLE INPUT: 
Python基础

EXAMPLE JSON OUTPUT:
{
    "sub_nodes": ["变量与类型", "控制流", "函数", "模块与包"]
}
`;

    try {
        const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `父节点是：【${parentText}】` }
            ],
            response_format: {
                type: 'json_object'
            }
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) return [];

        const data = JSON.parse(content);
        return data.sub_nodes || [];
    } catch (error: any) {
        console.error('DeepSeek API Error:', error);
        throw new Error(error.message || 'AI 生成失败');
    }
}
