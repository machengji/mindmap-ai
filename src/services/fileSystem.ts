// 封装 File System Access API
// 注意：仅在 Chrome, Edge 等现代浏览器的 HTTPS 或 localhost 环境下可用

let currentFileHandle: any = null;

export interface FileData {
  content: any;
  name: string;
}

// 新建项目（重置句柄）
export function newLocalProject() {
  currentFileHandle = null;
}

// 打开本地文件
export async function openLocalFile(): Promise<FileData | null> {
  try {
    // @ts-ignore
    if (!window.showOpenFilePicker) {
      alert('您的浏览器不支持直接访问本地文件，请使用 Chrome 或 Edge 浏览器。');
      return null;
    }

    // @ts-ignore
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: 'MindMap Project',
        accept: { 'application/json': ['.json', '.mindmap'] }
      }],
      multiple: false
    });
    
    currentFileHandle = handle;
    const file = await currentFileHandle.getFile();
    const text = await file.text();
    
    try {
      const json = JSON.parse(text);
      return { content: json, name: file.name };
    } catch (e) {
      alert('文件格式错误，无法解析 JSON');
      return null;
    }
  } catch (err: any) {
    // 用户取消选择不报错
    if (err.name !== 'AbortError') {
      console.error('打开文件失败:', err);
      alert('无法打开文件: ' + err.message);
    }
    return null;
  }
}

// 保存当前文件
export async function saveLocalFile(content: any): Promise<boolean> {
  try {
    if (!currentFileHandle) {
      // 如果没有句柄（是新文件），则触发“另存为”
      return await saveLocalFileAs(content);
    }
    
    const writable = await currentFileHandle.createWritable();
    await writable.write(JSON.stringify(content, null, 2));
    await writable.close();
    console.log('保存成功');
    return true;
  } catch (err: any) {
    console.error('保存文件失败:', err);
    alert('保存失败: ' + err.message);
    return false;
  }
}

// 另存为
export async function saveLocalFileAs(content: any): Promise<boolean> {
  try {
    // @ts-ignore
    if (!window.showSaveFilePicker) {
      alert('您的浏览器不支持本地文件保存。');
      return false;
    }

    // @ts-ignore
    const handle = await window.showSaveFilePicker({
      suggestedName: 'my-mindmap.json',
      types: [{
        description: 'MindMap Project',
        accept: { 'application/json': ['.json', '.mindmap'] }
      }]
    });
    
    currentFileHandle = handle;
    const writable = await currentFileHandle.createWritable();
    await writable.write(JSON.stringify(content, null, 2));
    await writable.close();
    return true;
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error('另存为失败:', err);
    }
    return false;
  }
}

export function getCurrentFileName(): string {
    return currentFileHandle ? currentFileHandle.name : '未命名项目';
}
