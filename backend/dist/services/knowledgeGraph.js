/**
 * DSE智能刷题系统 - 知识图谱模块
 *
 * 功能：
 * 1. 定义知识节点和关系数据结构
 * 2. 管理知识图谱的存储和查询
 * 3. 分析题目的知识点覆盖
 */
// ===== DSE核心知识结构 =====
// 数学科知识点
export const MATH_KNOWLEDGE_TREE = [
    // 一级主题
    { name: '数与代数', nameEn: 'Number and Algebra', type: 'topic', subject: 'math', metadata: { examFrequency: 5, teachingOrder: 1 } },
    { name: '几何与空间', nameEn: 'Geometry and Space', type: 'topic', subject: 'math', metadata: { examFrequency: 5, teachingOrder: 2 } },
    { name: '统计与概率', nameEn: 'Statistics and Probability', type: 'topic', subject: 'math', metadata: { examFrequency: 4, teachingOrder: 3 } },
    { name: '微积分', nameEn: 'Calculus', type: 'topic', subject: 'math', metadata: { examFrequency: 4, teachingOrder: 4 } },
    // 数与代数 - 二级主题
    { name: '因数与倍数', nameEn: 'Factors and Multiples', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 2, examFrequency: 4 } },
    { name: '最大公因数HCF', nameEn: 'Highest Common Factor', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 2, examFrequency: 4 } },
    { name: '最小公倍数LCM', nameEn: 'Lowest Common Multiple', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 2, examFrequency: 4 } },
    { name: '质因数分解', nameEn: 'Prime Factorization', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 2, examFrequency: 3 } },
    { name: '代数表达式', nameEn: 'Algebraic Expressions', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '多项式', nameEn: 'Polynomials', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '方程', nameEn: 'Equations', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '一元一次方程', nameEn: 'Linear Equations', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 2, examFrequency: 5 } },
    { name: '二元一次方程组', nameEn: 'Simultaneous Linear Equations', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 4 } },
    { name: '一元二次方程', nameEn: 'Quadratic Equations', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '不等式', nameEn: 'Inequalities', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 4 } },
    { name: '函数', nameEn: 'Functions', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 5 } },
    { name: '指数与对数', nameEn: 'Indices and Logarithms', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    { name: '数列与级数', nameEn: 'Sequences and Series', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    // 几何与空间 - 二级主题
    { name: '平面几何', nameEn: 'Plane Geometry', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '三角形', nameEn: 'Triangles', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '四边形', nameEn: 'Quadrilaterals', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 4 } },
    { name: '圆', nameEn: 'Circles', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 5 } },
    { name: '三角学', nameEn: 'Trigonometry', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 5 } },
    { name: '坐标几何', nameEn: 'Coordinate Geometry', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 5 } },
    { name: '向量', nameEn: 'Vectors', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    // 统计与概率 - 二级主题
    { name: '数据描述', nameEn: 'Data Description', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 2, examFrequency: 4 } },
    { name: '概率', nameEn: 'Probability', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '排列组合', nameEn: 'Permutation and Combination', type: 'concept', subject: 'math', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    // 技能节点
    { name: '计算技能', nameEn: 'Calculation Skills', type: 'skill', subject: 'math', metadata: { description: '数值计算能力' } },
    { name: '代数操作', nameEn: 'Algebraic Manipulation', type: 'skill', subject: 'math', metadata: { description: '代数式变形能力' } },
    { name: '几何推理', nameEn: 'Geometric Reasoning', type: 'skill', subject: 'math', metadata: { description: '几何证明和推理能力' } },
    { name: '问题建模', nameEn: 'Problem Modeling', type: 'skill', subject: 'math', metadata: { description: '将实际问题转化为数学模型' } },
    { name: '图表分析', nameEn: 'Graph Analysis', type: 'skill', subject: 'math', metadata: { description: '分析和解读图表' } },
];
// 物理科知识点
export const PHYSICS_KNOWLEDGE_TREE = [
    // 一级主题
    { name: '力学', nameEn: 'Mechanics', type: 'topic', subject: 'physics', metadata: { examFrequency: 5, teachingOrder: 1 } },
    { name: '热学', nameEn: 'Heat', type: 'topic', subject: 'physics', metadata: { examFrequency: 4, teachingOrder: 2 } },
    { name: '波动与光', nameEn: 'Waves and Light', type: 'topic', subject: 'physics', metadata: { examFrequency: 4, teachingOrder: 3 } },
    { name: '电磁学', nameEn: 'Electromagnetism', type: 'topic', subject: 'physics', metadata: { examFrequency: 5, teachingOrder: 4 } },
    { name: '原子物理', nameEn: 'Atomic Physics', type: 'topic', subject: 'physics', metadata: { examFrequency: 3, teachingOrder: 5 } },
    // 力学 - 二级主题
    { name: '运动学', nameEn: 'Kinematics', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '牛顿运动定律', nameEn: 'Newton\'s Laws', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '动量与碰撞', nameEn: 'Momentum and Collisions', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    { name: '功与能量', nameEn: 'Work and Energy', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 4, examFrequency: 5 } },
    { name: '圆周运动', nameEn: 'Circular Motion', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    { name: '万有引力', nameEn: 'Gravitation', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 4, examFrequency: 3 } },
    // 电磁学 - 二级主题
    { name: '静电学', nameEn: 'Electrostatics', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 3, examFrequency: 4 } },
    { name: '电路', nameEn: 'Electric Circuits', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '电磁感应', nameEn: 'Electromagnetic Induction', type: 'concept', subject: 'physics', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    // 技能节点
    { name: '物理计算', nameEn: 'Physics Calculation', type: 'skill', subject: 'physics', metadata: { description: '物理公式应用和计算' } },
    { name: '实验分析', nameEn: 'Experimental Analysis', type: 'skill', subject: 'physics', metadata: { description: '实验数据分析和误差处理' } },
    { name: '物理建模', nameEn: 'Physics Modeling', type: 'skill', subject: 'physics', metadata: { description: '建立物理模型' } },
];
// 化学科知识点
export const CHEMISTRY_KNOWLEDGE_TREE = [
    // 一级主题
    { name: '物质结构', nameEn: 'Structure of Matter', type: 'topic', subject: 'chemistry', metadata: { examFrequency: 5, teachingOrder: 1 } },
    { name: '化学反应', nameEn: 'Chemical Reactions', type: 'topic', subject: 'chemistry', metadata: { examFrequency: 5, teachingOrder: 2 } },
    { name: '有机化学', nameEn: 'Organic Chemistry', type: 'topic', subject: 'chemistry', metadata: { examFrequency: 4, teachingOrder: 3 } },
    { name: '分析化学', nameEn: 'Analytical Chemistry', type: 'topic', subject: 'chemistry', metadata: { examFrequency: 4, teachingOrder: 4 } },
    // 物质结构 - 二级主题
    { name: '原子结构', nameEn: 'Atomic Structure', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '化学键', nameEn: 'Chemical Bonding', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 4, examFrequency: 5 } },
    { name: '元素周期表', nameEn: 'Periodic Table', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    // 化学反应 - 二级主题
    { name: '化学方程式', nameEn: 'Chemical Equations', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '摩尔计算', nameEn: 'Mole Calculations', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 4, examFrequency: 5 } },
    { name: '氧化还原', nameEn: 'Redox Reactions', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    { name: '酸碱反应', nameEn: 'Acid-Base Reactions', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 3, examFrequency: 5 } },
    { name: '化学平衡', nameEn: 'Chemical Equilibrium', type: 'concept', subject: 'chemistry', metadata: { difficultyBaseline: 4, examFrequency: 4 } },
    // 技能节点
    { name: '化学计算', nameEn: 'Chemical Calculation', type: 'skill', subject: 'chemistry', metadata: { description: '化学量计算' } },
    { name: '方程式配平', nameEn: 'Equation Balancing', type: 'skill', subject: 'chemistry', metadata: { description: '化学方程式配平' } },
    { name: '实验操作', nameEn: 'Lab Skills', type: 'skill', subject: 'chemistry', metadata: { description: '化学实验操作知识' } },
];
// ===== 知识图谱管理器 =====
export class KnowledgeGraphManager {
    nodes;
    relationships;
    nodesBySubject;
    nodesByType;
    constructor() {
        this.nodes = new Map();
        this.relationships = new Map();
        this.nodesBySubject = new Map();
        this.nodesByType = new Map();
    }
    /**
     * 初始化知识图谱（加载默认数据）
     */
    initialize() {
        const now = new Date().toISOString();
        // 加载数学知识点
        for (const node of MATH_KNOWLEDGE_TREE) {
            this.addNode({
                ...node,
                id: this.generateNodeId(node.subject || 'math', node.name),
                createdAt: now,
                updatedAt: now
            });
        }
        // 加载物理知识点
        for (const node of PHYSICS_KNOWLEDGE_TREE) {
            this.addNode({
                ...node,
                id: this.generateNodeId(node.subject || 'physics', node.name),
                createdAt: now,
                updatedAt: now
            });
        }
        // 加载化学知识点
        for (const node of CHEMISTRY_KNOWLEDGE_TREE) {
            this.addNode({
                ...node,
                id: this.generateNodeId(node.subject || 'chemistry', node.name),
                createdAt: now,
                updatedAt: now
            });
        }
        // 建立默认关系
        this.buildDefaultRelationships();
    }
    /**
     * 生成节点ID
     */
    generateNodeId(subject, name) {
        return `${subject}_${name.replace(/\s+/g, '_').toLowerCase()}`;
    }
    /**
     * 添加知识节点
     */
    addNode(node) {
        this.nodes.set(node.id, node);
        // 按科目索引
        const subject = node.subject || 'general';
        if (!this.nodesBySubject.has(subject)) {
            this.nodesBySubject.set(subject, []);
        }
        this.nodesBySubject.get(subject).push(node);
        // 按类型索引
        if (!this.nodesByType.has(node.type)) {
            this.nodesByType.set(node.type, []);
        }
        this.nodesByType.get(node.type).push(node);
    }
    /**
     * 添加关系
     */
    addRelationship(rel) {
        this.relationships.set(rel.id, rel);
    }
    /**
     * 获取节点
     */
    getNode(id) {
        return this.nodes.get(id);
    }
    /**
     * 按科目获取节点
     */
    getNodesBySubject(subject) {
        return this.nodesBySubject.get(subject) || [];
    }
    /**
     * 按类型获取节点
     */
    getNodesByType(type) {
        return this.nodesByType.get(type) || [];
    }
    /**
     * 获取相关概念
     */
    getRelatedConcepts(conceptId, depth = 2) {
        const visited = new Set();
        const result = [];
        this.traverseRelated(conceptId, depth, visited, result);
        return result;
    }
    traverseRelated(nodeId, depth, visited, result) {
        if (depth <= 0 || visited.has(nodeId))
            return;
        visited.add(nodeId);
        // 找到所有相关的关系
        for (const rel of this.relationships.values()) {
            let targetId = null;
            if (rel.sourceId === nodeId) {
                targetId = rel.targetId;
            }
            else if (rel.targetId === nodeId && rel.metadata?.bidirectional) {
                targetId = rel.sourceId;
            }
            if (targetId && !visited.has(targetId)) {
                const node = this.nodes.get(targetId);
                if (node) {
                    result.push(node);
                    this.traverseRelated(targetId, depth - 1, visited, result);
                }
            }
        }
    }
    /**
     * 查找知识路径
     */
    findPath(startId, endId) {
        // 使用BFS找最短路径
        const queue = [
            { nodeId: startId, path: [startId], rels: [] }
        ];
        const visited = new Set();
        while (queue.length > 0) {
            const { nodeId, path, rels } = queue.shift();
            if (nodeId === endId) {
                return {
                    nodes: path.map(id => this.nodes.get(id)).filter(Boolean),
                    relationships: rels.map(id => this.relationships.get(id)).filter(Boolean),
                    totalStrength: rels.reduce((sum, relId) => {
                        const rel = this.relationships.get(relId);
                        return sum + (rel?.strength || 0);
                    }, 0) / Math.max(rels.length, 1)
                };
            }
            if (visited.has(nodeId))
                continue;
            visited.add(nodeId);
            // 扩展邻居
            for (const rel of this.relationships.values()) {
                let nextId = null;
                if (rel.sourceId === nodeId) {
                    nextId = rel.targetId;
                }
                else if (rel.targetId === nodeId) {
                    nextId = rel.sourceId;
                }
                if (nextId && !visited.has(nextId)) {
                    queue.push({
                        nodeId: nextId,
                        path: [...path, nextId],
                        rels: [...rels, rel.id]
                    });
                }
            }
        }
        return null;
    }
    /**
     * 分析题目的知识覆盖
     */
    analyzeQuestionCoverage(question) {
        const text = question.question.toLowerCase();
        const tags = question.topicTags || [];
        const subject = question.subject || 'math';
        // 匹配主要概念
        const primaryConcepts = [];
        const secondaryConcepts = [];
        const subjectNodes = this.getNodesBySubject(subject);
        for (const node of subjectNodes) {
            const nodeName = node.name.toLowerCase();
            const nodeNameEn = (node.nameEn || '').toLowerCase();
            // 检查是否在题目标签中
            if (tags.some(tag => tag.toLowerCase().includes(nodeName) || nodeName.includes(tag.toLowerCase()))) {
                primaryConcepts.push(node.id);
                continue;
            }
            // 检查是否在题目文本中
            if (text.includes(nodeName) || text.includes(nodeNameEn)) {
                if (node.type === 'concept') {
                    primaryConcepts.push(node.id);
                }
                else {
                    secondaryConcepts.push(node.id);
                }
            }
        }
        // 计算覆盖深度
        let coverageDepth = 1;
        if (primaryConcepts.length >= 3)
            coverageDepth = 3;
        else if (primaryConcepts.length >= 2)
            coverageDepth = 2;
        // 提取技能覆盖
        const cognitiveSkills = this.extractCognitiveSkills(text);
        const proceduralSkills = this.extractProceduralSkills(text, subject);
        // 获取前置知识
        const prerequisites = [];
        for (const conceptId of primaryConcepts) {
            const node = this.nodes.get(conceptId);
            if (node?.metadata.prerequisites) {
                prerequisites.push(...node.metadata.prerequisites);
            }
        }
        // 获取相关主题
        const relatedTopics = [];
        for (const conceptId of primaryConcepts.slice(0, 3)) {
            const related = this.getRelatedConcepts(conceptId, 1);
            relatedTopics.push(...related.map(n => n.id));
        }
        return {
            conceptualCoverage: {
                primaryConcepts,
                secondaryConcepts,
                coverageDepth
            },
            skillCoverage: {
                cognitiveSkills,
                proceduralSkills
            },
            prerequisites: [...new Set(prerequisites)],
            relatedTopics: [...new Set(relatedTopics)]
        };
    }
    /**
     * 提取认知技能
     */
    extractCognitiveSkills(text) {
        const skills = [];
        const patterns = [
            { skill: 'remember', regex: /列出|定义|识别|记住|list|define|identify/i },
            { skill: 'understand', regex: /解释|描述|说明|理解|interpret|describe|explain/i },
            { skill: 'apply', regex: /应用|计算|求|解|使用|apply|calculate|solve|use/i },
            { skill: 'analyze', regex: /分析|比较|区分|分类|analyze|compare|classify|distinguish/i },
            { skill: 'evaluate', regex: /评价|判断|评估|justify|evaluate|judge|assess/i },
            { skill: 'create', regex: /设计|创造|发明|开发|制定|design|create|invent|develop/i }
        ];
        for (const { skill, regex } of patterns) {
            if (regex.test(text)) {
                skills.push(skill);
            }
        }
        return skills.length > 0 ? skills : ['apply'];
    }
    /**
     * 提取过程技能
     */
    extractProceduralSkills(text, subject) {
        const skills = [];
        const skillPatterns = {
            math: [
                { skill: 'calculation', regex: /计算|算|求值|calculate/i },
                { skill: 'factorization', regex: /分解|因式|factori/i },
                { skill: 'equation_solving', regex: /解方程|solve.*equation/i },
                { skill: 'graphing', regex: /画图|作图|绘制|graph|plot|draw/i },
                { skill: 'proof', regex: /证明|证|prove|show/i }
            ],
            physics: [
                { skill: 'formula_application', regex: /代入|应用公式|apply.*formula/i },
                { skill: 'unit_conversion', regex: /单位|转换|convert.*unit/i },
                { skill: 'diagram_analysis', regex: /图|分析|diagram|analyze/i }
            ],
            chemistry: [
                { skill: 'equation_balancing', regex: /配平|平衡|balance.*equation/i },
                { skill: 'mole_calculation', regex: /摩尔|物质的量|mole/i },
                { skill: 'structure_drawing', regex: /结构式|画出|draw.*structure/i }
            ]
        };
        const patterns = skillPatterns[subject] || skillPatterns.math;
        for (const { skill, regex } of patterns) {
            if (regex.test(text)) {
                skills.push(skill);
            }
        }
        return skills.length > 0 ? skills : ['general'];
    }
    /**
     * 建立默认关系
     */
    buildDefaultRelationships() {
        const now = new Date().toISOString();
        let relId = 0;
        // 数学科关系
        const mathRelations = [
            // 因数与倍数相关
            { source: 'math_因数与倍数', target: 'math_最大公因数hcf', type: 'leads_to', strength: 0.9 },
            { source: 'math_因数与倍数', target: 'math_最小公倍数lcm', type: 'leads_to', strength: 0.9 },
            { source: 'math_因数与倍数', target: 'math_质因数分解', type: 'leads_to', strength: 0.8 },
            { source: 'math_质因数分解', target: 'math_最大公因数hcf', type: 'related_to', strength: 0.9 },
            { source: 'math_质因数分解', target: 'math_最小公倍数lcm', type: 'related_to', strength: 0.9 },
            // 代数相关
            { source: 'math_代数表达式', target: 'math_多项式', type: 'leads_to', strength: 0.8 },
            { source: 'math_多项式', target: 'math_方程', type: 'leads_to', strength: 0.7 },
            { source: 'math_一元一次方程', target: 'math_二元一次方程组', type: 'prerequisite', strength: 0.9 },
            { source: 'math_一元一次方程', target: 'math_一元二次方程', type: 'prerequisite', strength: 0.8 },
            // 几何相关
            { source: 'math_平面几何', target: 'math_三角形', type: 'part_of', strength: 0.9 },
            { source: 'math_平面几何', target: 'math_四边形', type: 'part_of', strength: 0.9 },
            { source: 'math_平面几何', target: 'math_圆', type: 'part_of', strength: 0.9 },
            { source: 'math_三角形', target: 'math_三角学', type: 'leads_to', strength: 0.8 },
            // 技能关系
            { source: 'math_方程', target: 'math_代数操作', type: 'requires_skill', strength: 0.9 },
            { source: 'math_三角形', target: 'math_几何推理', type: 'requires_skill', strength: 0.8 },
        ];
        for (const rel of mathRelations) {
            this.addRelationship({
                id: `rel_${++relId}`,
                sourceId: rel.source,
                targetId: rel.target,
                type: rel.type,
                strength: rel.strength,
                metadata: { bidirectional: rel.type === 'related_to' },
                createdAt: now
            });
        }
    }
    /**
     * 获取所有节点
     */
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    /**
     * 获取所有关系
     */
    getAllRelationships() {
        return Array.from(this.relationships.values());
    }
    /**
     * 根据知识点推荐题目主题
     */
    recommendTopics(subject, userWeakAreas = [], recentTopics = [], count = 5) {
        const subjectNodes = this.getNodesBySubject(subject)
            .filter(n => n.type === 'concept');
        // 计算每个主题的推荐分数
        const scored = subjectNodes.map(node => {
            let score = 0;
            // 考试频率权重
            score += (node.metadata.examFrequency || 3) * 2;
            // 如果是薄弱环节，加分
            if (userWeakAreas.some(area => node.name.includes(area) || node.id.includes(area))) {
                score += 5;
            }
            // 如果最近做过，减分（避免重复）
            if (recentTopics.some(topic => node.id.includes(topic))) {
                score -= 3;
            }
            // 随机因素（增加多样性）
            score += Math.random() * 2;
            return { node, score };
        });
        // 按分数排序并返回
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, count).map(s => s.node.name);
    }
}
// 单例实例
let knowledgeGraphInstance = null;
export function getKnowledgeGraph() {
    if (!knowledgeGraphInstance) {
        knowledgeGraphInstance = new KnowledgeGraphManager();
        knowledgeGraphInstance.initialize();
    }
    return knowledgeGraphInstance;
}
export default {
    KnowledgeGraphManager,
    getKnowledgeGraph,
    MATH_KNOWLEDGE_TREE,
    PHYSICS_KNOWLEDGE_TREE,
    CHEMISTRY_KNOWLEDGE_TREE
};
//# sourceMappingURL=knowledgeGraph.js.map