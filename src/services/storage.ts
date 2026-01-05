import AV from 'leancloud-storage';
import type { MindNode } from '../types';

const APP_ID = 'fNJb5kxiG5JACBivlXAuGqly-gzGzoHsz';
const APP_KEY = '0DF5TPnflU45HnbyFvVNPLxq';
const SERVER_URL = 'https://fnjb5kxi.lc-cn-n1-shared.com';

// 初始化 LeanCloud
if (APP_ID && APP_ID !== '你的_APP_ID') {
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
