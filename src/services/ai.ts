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
你是一个专业的思维导图与知识架构专家。用户会提供当前节点的路径和内容。
请你根据上下文，遵循 **MECE原则（相互独立，完全穷尽）**，对当前节点进行**精准、核心**的分解。

要求：
1. **精炼相关**：生成的子节点必须与当前节点高度相关。不要为了凑数而生成次要节点。
2. **数量灵活**：根据内容的实际需求，生成最核心的 **3 到 6 个** 子节点。
3. **具体明确**：子节点应具体、简练，避免抽象的废话。
4. **逻辑清晰**：子节点之间应保持同级并列关系。

请严格以 JSON 格式输出。

EXAMPLE INPUT: 
路径: Python学习路线 > 基础语法
当前节点: 变量与类型

EXAMPLE JSON OUTPUT:
{
    "sub_nodes": ["数值类型(int/float)", "布尔类型(bool)", "字符串(str)", "容器类型(list/dict)", "变量命名规范"]
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
        console.log('AI Response Content:', content); // Debug log
        if (!content) return [];

        const data = JSON.parse(content);
        const nodes = data.sub_nodes || [];
        console.log('Parsed Nodes:', nodes); // Debug log
        return nodes;
    } catch (error: any) {
        console.error('DeepSeek API Error:', error);
        throw new Error(error.message || 'AI 生成失败');
    }
}
