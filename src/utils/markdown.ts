import type { MindNode } from '../types';

export function jsonToMarkdown(node: MindNode, depth = 0): string {
    const indent = '  '.repeat(depth);
    let markdown = `${indent}- ${node.text}\n`;

    if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
            markdown += jsonToMarkdown(child, depth + 1);
        });
    }

    return markdown;
}

export function downloadMarkdown(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
