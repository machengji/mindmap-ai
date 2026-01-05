export interface MindNode {
    id: string;
    text: string;
    children: MindNode[];
    isExpanded: boolean;
    isLoading: boolean;
}
