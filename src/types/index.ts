export interface Attachment {
    id: string;
    name: string;
    url: string;
    type: 'image' | 'file';
}

export interface MindNode {
    id: string;
    text: string;
    children: MindNode[];
    isExpanded?: boolean;
    isLoading?: boolean;
    attachments?: Attachment[];
}
