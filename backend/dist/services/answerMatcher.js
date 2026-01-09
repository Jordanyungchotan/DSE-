/**
 * 智能答案匹配系统
 * 解决DSE刷题系统中的答案格式问题
 */
// ===== 题目类型规则配置 =====
export const QUESTION_TYPE_RULES = {
    multiple_choice: {
        requiredPrecision: 0,
        unitRequired: false,
        acceptEquationForm: false,
        acceptPlainNumber: false,
        caseSensitive: false,
        matchingStrategies: ['exact', 'normalized']
    },
    calculation: {
        requiredPrecision: 0.001,
        unitRequired: false,
        acceptEquationForm: true,
        acceptPlainNumber: true,
        caseSensitive: false,
        matchingStrategies: ['numeric', 'equation', 'normalized']
    },
    short_answer: {
        requiredPrecision: 0,
        unitRequired: false,
        acceptEquationForm: false,
        acceptPlainNumber: true,
        caseSensitive: false,
        matchingStrategies: ['exact', 'normalized', 'semantic']
    },
    explanation: {
        requiredPrecision: 0,
        unitRequired: false,
        acceptEquationForm: false,
        acceptPlainNumber: false,
        caseSensitive: false,
        matchingStrategies: ['semantic', 'ai_judged']
    }
};
// ===== 答案预处理器 =====
export class AnswerPreprocessor {
    /**
     * 通用答案规范化
     */
    normalize(answer) {
        if (!answer)
            return '';
        return answer
            // 去除首尾空白
            .trim()
            // 去除多余空格
            .replace(/\s+/g, ' ')
            // 全角转半角
            .replace(/[Ａ-Ｚａ-ｚ０-９]/g, char => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
            // 统一中文标点为英文
            .replace(/[，]/g, ',')
            .replace(/[。]/g, '.')
            .replace(/[；]/g, ';')
            .replace(/[：]/g, ':')
            .replace(/[（]/g, '(')
            .replace(/[）]/g, ')')
            .replace(/[【]/g, '[')
            .replace(/[】]/g, ']')
            // 统一货币符号
            .replace(/[￥＄]/g, '¥')
            // 统一等号
            .replace(/[＝]/g, '=')
            // 统一运算符
            .replace(/[×✕✖]/g, '*')
            .replace(/[÷]/g, '/')
            .replace(/[−–—]/g, '-')
            // 去除常见开头词
            .replace(/^(答|答案|解|结果是?|等于|答：|答案：)[:：]?\s*/i, '')
            // 去除常见结尾标点
            .replace(/[。．.!！?？]$/, '');
    }
    /**
     * 数学答案预处理
     */
    preprocessMath(answer) {
        return this.normalize(answer)
            // 统一变量名
            .replace(/[χΧ]/g, 'x')
            // 去除等号前后空格
            .replace(/\s*=\s*/g, '=')
            // 去除开头的等号
            .replace(/^=/, '')
            // 处理百分号
            .replace(/(\d+(?:\.\d+)?)\s*%/g, (_, num) => (parseFloat(num) / 100).toString());
    }
    /**
     * 选择题答案预处理
     */
    preprocessChoice(answer) {
        const normalized = this.normalize(answer).toUpperCase();
        // 提取选项字母
        const match = normalized.match(/^[A-D]/i);
        return match ? match[0] : normalized;
    }
    /**
     * 根据题目类型预处理答案
     */
    preprocess(answer, questionType) {
        if (!answer)
            return '';
        switch (questionType) {
            case 'multiple_choice':
                return this.preprocessChoice(answer);
            case 'calculation':
                return this.preprocessMath(answer);
            default:
                return this.normalize(answer);
        }
    }
}
// ===== 数值匹配器 =====
export class NumericMatcher {
    /**
     * 提取数字
     */
    extractNumber(str) {
        if (!str)
            return null;
        // 清理字符串
        const cleaned = str
            .replace(/[¥＄$€£]/g, '')
            .replace(/\s/g, '')
            .toLowerCase();
        // 处理中文数字单位
        let multiplier = 1;
        if (cleaned.includes('万'))
            multiplier = 10000;
        else if (cleaned.includes('千'))
            multiplier = 1000;
        else if (cleaned.includes('亿'))
            multiplier = 100000000;
        // 提取数字
        const match = cleaned.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
        if (!match)
            return null;
        const num = parseFloat(match[0]);
        return isNaN(num) ? null : num * multiplier;
    }
    /**
     * 数值相等性判断（带容差）
     */
    isNumericEqual(userNum, expectedNum, precision = 0.001) {
        if (expectedNum === 0) {
            return Math.abs(userNum) < precision;
        }
        // 相对误差
        const relativeError = Math.abs(userNum - expectedNum) / Math.abs(expectedNum);
        return relativeError < precision;
    }
    /**
     * 匹配数值
     */
    match(userAnswer, expectedAnswer, precision = 0.001) {
        const userNum = this.extractNumber(userAnswer);
        const expectedNum = this.extractNumber(expectedAnswer);
        if (userNum === null || expectedNum === null) {
            return false;
        }
        return this.isNumericEqual(userNum, expectedNum, precision);
    }
}
// ===== 方程匹配器 =====
export class EquationMatcher {
    numericMatcher = new NumericMatcher();
    /**
     * 提取方程的解
     */
    extractSolution(equation) {
        const cleaned = equation.replace(/\s/g, '').toLowerCase();
        // 格式1: x=4, X=4
        const match1 = cleaned.match(/[xy]\s*=\s*([-+]?\d*\.?\d+)/);
        if (match1)
            return parseFloat(match1[1]);
        // 格式2: 纯数字
        const match2 = cleaned.match(/^([-+]?\d*\.?\d+)$/);
        if (match2)
            return parseFloat(match2[1]);
        // 格式3: 解为4, 答案是4
        const match3 = cleaned.match(/(?:解|答案|答)[=:：]?\s*([-+]?\d*\.?\d+)/);
        if (match3)
            return parseFloat(match3[1]);
        // 格式4: =4
        const match4 = cleaned.match(/^=\s*([-+]?\d*\.?\d+)/);
        if (match4)
            return parseFloat(match4[1]);
        return null;
    }
    /**
     * 匹配方程答案
     */
    match(userAnswer, expectedAnswer) {
        const userSolution = this.extractSolution(userAnswer);
        const expectedSolution = this.extractSolution(expectedAnswer);
        if (userSolution === null || expectedSolution === null) {
            return false;
        }
        return this.numericMatcher.isNumericEqual(userSolution, expectedSolution);
    }
}
// ===== 单位处理器 =====
export class UnitProcessor {
    unitMap = {
        'm': ['meter', 'meters', '公尺', '米'],
        'cm': ['centimeter', 'centimeters', '厘米', '公分'],
        'mm': ['millimeter', 'millimeters', '毫米'],
        'km': ['kilometer', 'kilometers', '公里'],
        'kg': ['kilogram', 'kilograms', '公斤', '千克'],
        'g': ['gram', 'grams', '克'],
        's': ['second', 'seconds', '秒'],
        'min': ['minute', 'minutes', '分钟'],
        'h': ['hour', 'hours', '小时'],
        '¥': ['人民币', '元', 'RMB', 'CNY', '块'],
        '$': ['美元', '美金', 'USD'],
        '°': ['度', 'degree', 'degrees'],
        '%': ['percent', 'percentage', '百分比']
    };
    /**
     * 标准化单位
     */
    normalizeUnit(unit) {
        const lowerUnit = unit.toLowerCase().trim();
        for (const [standardUnit, variants] of Object.entries(this.unitMap)) {
            if (variants.some(v => v.toLowerCase() === lowerUnit) || standardUnit === lowerUnit) {
                return standardUnit;
            }
        }
        return unit;
    }
    /**
     * 提取数值和单位
     */
    extractValueAndUnit(text) {
        const match = text.match(/^([-+]?\d*\.?\d+)\s*(.*)$/);
        if (!match)
            return null;
        const value = parseFloat(match[1]);
        if (isNaN(value))
            return null;
        return {
            value,
            unit: this.normalizeUnit(match[2] || '')
        };
    }
}
// ===== 智能答案匹配器（主类）=====
export class IntelligentAnswerMatcher {
    preprocessor = new AnswerPreprocessor();
    numericMatcher = new NumericMatcher();
    equationMatcher = new EquationMatcher();
    unitProcessor = new UnitProcessor();
    /**
     * 多层匹配策略
     */
    async matchAnswer(userAnswer, expectedAnswer, questionType) {
        // 获取题目类型规则
        const rules = QUESTION_TYPE_RULES[questionType] || QUESTION_TYPE_RULES.short_answer;
        // 第1层：完全匹配
        if (this.exactMatch(userAnswer, expectedAnswer)) {
            return this.createResult(true, 'exact', userAnswer, expectedAnswer, 1.0, '答案完全正确！🎉');
        }
        // 预处理答案
        const normalizedUser = this.preprocessor.preprocess(userAnswer, questionType);
        const normalizedExpected = this.preprocessor.preprocess(expectedAnswer, questionType);
        // 第2层：规范化后匹配
        if (this.normalizedMatch(normalizedUser, normalizedExpected)) {
            return this.createResult(true, 'normalized', userAnswer, expectedAnswer, 0.95, '答案正确！（系统已自动识别您的答案格式）✅');
        }
        // 第3层：数值匹配（针对计算题）
        if (rules.acceptPlainNumber && this.numericMatcher.match(normalizedUser, normalizedExpected, rules.requiredPrecision)) {
            return this.createResult(true, 'numeric', userAnswer, expectedAnswer, 0.9, '答案正确！（数值匹配）✅');
        }
        // 第4层：方程匹配
        if (rules.acceptEquationForm && this.equationMatcher.match(normalizedUser, normalizedExpected)) {
            return this.createResult(true, 'equation', userAnswer, expectedAnswer, 0.9, '答案正确！（系统已识别方程解）✅');
        }
        // 第5层：选择题特殊处理
        if (questionType === 'multiple_choice') {
            const choiceResult = this.matchChoice(normalizedUser, normalizedExpected);
            if (choiceResult) {
                return this.createResult(true, 'normalized', userAnswer, expectedAnswer, 0.95, '答案正确！✅');
            }
        }
        // 答案不正确，生成反馈
        const feedback = this.generateWrongAnswerFeedback(userAnswer, expectedAnswer, questionType, rules);
        return this.createResult(false, 'exact', userAnswer, expectedAnswer, 0, feedback);
    }
    /**
     * 完全匹配
     */
    exactMatch(userAnswer, expectedAnswer) {
        return userAnswer.trim() === expectedAnswer.trim();
    }
    /**
     * 规范化后匹配
     */
    normalizedMatch(normalizedUser, normalizedExpected) {
        // 忽略大小写比较
        return normalizedUser.toLowerCase() === normalizedExpected.toLowerCase();
    }
    /**
     * 选择题匹配
     */
    matchChoice(userChoice, expectedChoice) {
        // 只比较第一个字符（选项字母）
        const userLetter = userChoice.charAt(0).toUpperCase();
        const expectedLetter = expectedChoice.charAt(0).toUpperCase();
        return userLetter === expectedLetter && /^[A-D]$/.test(userLetter);
    }
    /**
     * 生成错误答案反馈
     */
    generateWrongAnswerFeedback(userAnswer, expectedAnswer, questionType, rules) {
        const suggestions = [];
        // 检查是否可能是格式问题
        const userNum = this.numericMatcher.extractNumber(userAnswer);
        const expectedNum = this.numericMatcher.extractNumber(expectedAnswer);
        if (userNum !== null && expectedNum !== null) {
            // 用户输入了数字，可能是格式问题
            if (this.numericMatcher.isNumericEqual(userNum, expectedNum, 0.01)) {
                return '数值接近正确，请检查精度或格式。';
            }
        }
        // 检查是否需要单位
        if (rules.unitRequired && !/[a-zA-Z°%¥$€£]/.test(userAnswer)) {
            suggestions.push('请检查是否需要添加单位');
        }
        // 检查方程格式
        if (rules.acceptEquationForm && /^\d+$/.test(userAnswer.trim())) {
            suggestions.push('可以尝试使用 x=数值 的格式');
        }
        if (suggestions.length > 0) {
            return `答案不正确。提示：${suggestions.join('；')}`;
        }
        return '答案不正确，请再仔细检查一下。';
    }
    /**
     * 创建匹配结果
     */
    createResult(isCorrect, matchType, userAnswer, expectedAnswer, confidence, feedback) {
        return {
            isCorrect,
            matchType,
            userAnswer,
            normalizedUserAnswer: this.preprocessor.normalize(userAnswer),
            expectedAnswer,
            confidence,
            feedback
        };
    }
}
// ===== 导出单例实例 =====
export const answerMatcher = new IntelligentAnswerMatcher();
//# sourceMappingURL=answerMatcher.js.map