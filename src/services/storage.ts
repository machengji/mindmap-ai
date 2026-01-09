import AV from 'leancloud-storage';
import type { MindNode } from '../types';

const APP_ID = 'fNJb5kxiG5JACBivlXAuGqly-gzGzoHsz';
const APP_KEY = '0DF5TPnflU45HnbyFvVNPLxq';
const SERVER_URL = 'https://fnjb5kxi.lc-cn-n1-shared.com';

// 初始化 LeanCloud
if (APP_ID) {
    AV.init({
        appId: APP_ID,
        appKey: APP_KEY,
        serverURL: SERVER_URL
    });
    console.log('%c✅ LeanCloud 已初始化，云同步模式开启', 'color: #007aff; font-weight: bold;');
}

const Mindmap = AV.Object.extend('Mindmap');

export const saveMindmap = async (rootNode: MindNode) => {
    try {
        // 每次保存都创建一个新的记录
        const mindmap = new Mindmap();

        mindmap.set('content', JSON.stringify(rootNode));
        mindmap.set('title', rootNode.text);
        await mindmap.save();
        console.log('云端保存成功 (已创建新记录)');
    } catch (error) {
        console.error('云端保存失败:', error);
    }
};

export const loadMindmap = async (): Promise<MindNode | null> => {
    try {
        const query = new AV.Query('Mindmap');
        query.descending('updatedAt');
        const mindmap = await query.first();

        if (mindmap && mindmap.get('content')) {
            return JSON.parse(mindmap.get('content'));
        }
        return null;
    } catch (error) {
        console.error('云端加载失败:', error);
        return null;
    }
};

export const fetchHistory = async (limit = 10) => {
    try {
        const query = new AV.Query('Mindmap');
        query.descending('createdAt');
        query.limit(limit);
        const results = await query.find();
        return results.map(item => ({
            id: item.id,
            title: item.get('title'),
            createdAt: item.createdAt,
            content: item.get('content')
        }));
    } catch (error) {
        console.error('获取历史记录失败:', error);
        return [];
    }
};

export const deleteHistoryItem = async (id: string): Promise<boolean> => {
    try {
        const todo = AV.Object.createWithoutData('Mindmap', id);
        await todo.destroy();
        return true;
    } catch (error) {
        console.error('删除历史记录失败:', error);
        return false;
    }
};

const Config = AV.Object.extend('Config');

export const saveApiKey = async (key: string) => {
    try {
        const query = new AV.Query('Config');
        query.equalTo('key', 'deepseek_api_key');
        let config = await query.first();

        if (!config) {
            config = new Config();
            config.set('key', 'deepseek_api_key');
        }

        config.set('value', key);
        await config.save();
        console.log('API Key 已同步到云端');
    } catch (error) {
        console.error('API Key 同步失败:', error);
    }
};

export const loadApiKey = async (): Promise<string | null> => {
    try {
        const query = new AV.Query('Config');
        query.equalTo('key', 'deepseek_api_key');
        const config = await query.first();
        return config ? config.get('value') : null;
    } catch (error) {
        console.error('加载 API Key 失败:', error);
        return null;
    }
};
