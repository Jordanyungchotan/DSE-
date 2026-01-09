/**
 * DSE智能刷题系统 - 知识图谱模块
 *
 * 功能：
 * 1. 定义知识节点和关系数据结构
 * 2. 管理知识图谱的存储和查询
 * 3. 分析题目的知识点覆盖
 */
export interface KnowledgeNode {
    id: string;
    name: string;
    nameEn?: string;
    type: 'subject' | 'topic' | 'concept' | 'skill';
    subject?: string;
    parentId?: string;
    metadata: {
        description?: string;
        difficultyBaseline?: number;
        prerequisites?: string[];
        commonMisconceptions?: string[];
        examFrequency?: number;
        teachingOrder?: number;
    };
    createdAt: string;
    updatedAt: string;
}
export interface Relationship {
    id: string;
    sourceId: string;
    targetId: string;
    type: 'prerequisite' | 'related_to' | 'part_of' | 'requires_skill' | 'leads_to';
    strength: number;
    metadata?: {
        description?: string;
        bidirectional?: boolean;
    };
    createdAt: string;
}
export interface KnowledgePath {
    nodes: KnowledgeNode[];
    relationships: Relationship[];
    totalStrength: number;
}
export interface CoverageScore {
    conceptualCoverage: {
        primaryConcepts: string[];
        secondaryConcepts: string[];
        coverageDepth: number;
    };
    skillCoverage: {
        cognitiveSkills: string[];
        proceduralSkills: string[];
    };
    prerequisites: string[];
    relatedTopics: string[];
}
export declare const MATH_KNOWLEDGE_TREE: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>[];
export declare const PHYSICS_KNOWLEDGE_TREE: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>[];
export declare const CHEMISTRY_KNOWLEDGE_TREE: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>[];
export declare class KnowledgeGraphManager {
    private nodes;
    private relationships;
    private nodesBySubject;
    private nodesByType;
    constructor();
    /**
     * 初始化知识图谱（加载默认数据）
     */
    initialize(): void;
    /**
     * 生成节点ID
     */
    private generateNodeId;
    /**
     * 添加知识节点
     */
    addNode(node: KnowledgeNode): void;
    /**
     * 添加关系
     */
    addRelationship(rel: Relationship): void;
    /**
     * 获取节点
     */
    getNode(id: string): KnowledgeNode | undefined;
    /**
     * 按科目获取节点
     */
    getNodesBySubject(subject: string): KnowledgeNode[];
    /**
     * 按类型获取节点
     */
    getNodesByType(type: KnowledgeNode['type']): KnowledgeNode[];
    /**
     * 获取相关概念
     */
    getRelatedConcepts(conceptId: string, depth?: number): KnowledgeNode[];
    private traverseRelated;
    /**
     * 查找知识路径
     */
    findPath(startId: string, endId: string): KnowledgePath | null;
    /**
     * 分析题目的知识覆盖
     */
    analyzeQuestionCoverage(question: {
        question: string;
        topicTags?: string[];
        subject?: string;
        difficulty?: string;
    }): CoverageScore;
    /**
     * 提取认知技能
     */
    private extractCognitiveSkills;
    /**
     * 提取过程技能
     */
    private extractProceduralSkills;
    /**
     * 建立默认关系
     */
    private buildDefaultRelationships;
    /**
     * 获取所有节点
     */
    getAllNodes(): KnowledgeNode[];
    /**
     * 获取所有关系
     */
    getAllRelationships(): Relationship[];
    /**
     * 根据知识点推荐题目主题
     */
    recommendTopics(subject: string, userWeakAreas?: string[], recentTopics?: string[], count?: number): string[];
}
export declare function getKnowledgeGraph(): KnowledgeGraphManager;
declare const _default: {
    KnowledgeGraphManager: typeof KnowledgeGraphManager;
    getKnowledgeGraph: typeof getKnowledgeGraph;
    MATH_KNOWLEDGE_TREE: Omit<KnowledgeNode, "id" | "createdAt" | "updatedAt">[];
    PHYSICS_KNOWLEDGE_TREE: Omit<KnowledgeNode, "id" | "createdAt" | "updatedAt">[];
    CHEMISTRY_KNOWLEDGE_TREE: Omit<KnowledgeNode, "id" | "createdAt" | "updatedAt">[];
};
export default _default;
//# sourceMappingURL=knowledgeGraph.d.ts.map