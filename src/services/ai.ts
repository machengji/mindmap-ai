import OpenAI from 'openai';

let apiKey = localStorage.getItem('deepseek_api_key') || '';

export function setApiKey(key: string) {
    apiKey = key;
    localStorage.setItem('deepseek_api_key', key);
}

export function getApiKey() {
    return apiKey;
}

export async function fetchAIExpansion(path: string[]): Promise<string[]> {
    if (!apiKey) {
        throw new Error('请先设置 DeepSeek API Key');
    }

    const client = new OpenAI({
        apiKey: apiKey,
        baseURL: 'https://api.deepseek.com',
        dangerouslyAllowBrowser: true // 客户端调用需要开启
    });

    const currentNode = path[path.length - 1];
    const context = path.length > 1 ? `在【${path.slice(0, -1).join(' > ')}】的背景下，` : '';

    const systemPrompt = `
你是一个思维导图助手。用户会提供当前节点的路径和内容，请你根据上下文将其分解为 3-5 个具体的【子节点】。
请确保子节点与父级上下文高度相关，避免泛泛而谈。
请严格以 JSON 格式输出。

EXAMPLE INPUT: 
路径: Python学习路线 > 基础语法
当前节点: 变量与类型

EXAMPLE JSON OUTPUT:
{
    "sub_nodes": ["整数与浮点数", "字符串操作", "布尔值", "列表与元组", "字典与集合"]
}
`;

    try {
        const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${context}请分解当前节点：【${currentNode}】` }
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
