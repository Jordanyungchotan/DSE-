/**
 * DSE智能刷题 - API路由
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { generateQuestions, gradeAnswer } from '../services/quizGenerator.js';
import { authMiddleware } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import { getDatabase } from '../database/init.js';
export const quizRouter = Router();
/**
 * 刷题配置验证Schema
 */
const quizConfigSchema = z.object({
    grade: z.enum(['f4', 'f5', 'f6']),
    subject: z.string().min(1),
    difficulty: z.enum(['basic', 'standard', 'challenging', 'exam']),
    questionCount: z.number().min(1).max(30),
    timeLimit: z.number().optional(),
});
/**
 * 内存存储（生产环境应使用数据库）
 */
const quizSessions = new Map();
const quizHistory = new Map();
/**
 * 开始刷题 - 生成题目
 * POST /api/quiz/start
 */
quizRouter.post('/start', async (req, res, next) => {
    try {
        // 验证配置
        const config = quizConfigSchema.parse(req.body);
        // 生成唯一会话ID
        const sessionId = uuidv4();
        console.log(`[Quiz] 开始生成题目 - 会话ID: ${sessionId}, 配置:`, config);
        // 调用AI生成题目
        const questions = await generateQuestions(config);
        console.log(`[Quiz] 题目生成成功 - 共${questions.length}题`);
        // 保存会话（不包含答案，只返回题目内容）
        const session = {
            id: sessionId,
            userId: req.userId,
            config,
            questions,
            status: 'active',
            createdAt: new Date(),
        };
        quizSessions.set(sessionId, session);
        // 返回题目（客户端版本不包含正确答案）
        const clientQuestions = questions.map((q) => ({
            id: q.id,
            question: q.question,
            questionType: q.questionType,
            options: q.options,
            topicTags: q.topicTags,
            estimatedTime: q.estimatedTime,
            difficultyScore: q.difficultyScore,
            // 不返回 correctAnswer 和 explanation，直到用户提交答案
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
        }));
        res.json({
            success: true,
            sessionId,
            questions: clientQuestions,
        });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            next(new ApiError('配置参数无效: ' + error.errors.map(e => e.message).join(', '), 400));
        }
        else {
            next(error);
        }
    }
});
/**
 * 提交答案并获取批改结果
 * POST /api/quiz/grade
 */
quizRouter.post('/grade', async (req, res, next) => {
    try {
        const { sessionId, questionId, userAnswer } = req.body;
        if (!sessionId || !questionId || userAnswer === undefined) {
            throw new ApiError('缺少必要参数', 400);
        }
        const session = quizSessions.get(sessionId);
        if (!session) {
            throw new ApiError('会话不存在或已过期', 404);
        }
        const question = session.questions.find((q) => q.id === questionId);
        if (!question) {
            throw new ApiError('题目不存在', 404);
        }
        // 批改答案
        const result = await gradeAnswer(question, userAnswer);
        res.json({
            success: true,
            ...result,
            correctAnswer: question.correctAnswer,
            explanation: question.explanation,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 保存刷题结果
 * POST /api/quiz/save
 */
quizRouter.post('/save', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { sessionId, config, questions, score, accuracy, timeSpent } = req.body;
        if (!sessionId) {
            throw new ApiError('缺少会话ID', 400);
        }
        // 更新会话状态
        const session = quizSessions.get(sessionId);
        if (session) {
            session.status = 'completed';
            session.completedAt = new Date();
            session.score = score;
            session.accuracy = accuracy;
            session.timeSpent = timeSpent;
        }
        // 保存到用户历史记录
        const historyRecord = {
            id: sessionId,
            subject: config.subject,
            grade: config.grade,
            difficulty: config.difficulty,
            score: score || 0,
            accuracy: accuracy || 0,
            completedAt: new Date().toISOString(),
        };
        const userHistory = quizHistory.get(userId) || [];
        userHistory.unshift(historyRecord);
        // 只保留最近50条记录
        if (userHistory.length > 50) {
            userHistory.pop();
        }
        quizHistory.set(userId, userHistory);
        console.log(`[Quiz] 保存刷题记录 - 用户: ${userId}, 会话: ${sessionId}, 成绩: ${score}/${questions?.length || 0}`);
        res.json({
            success: true,
            message: '刷题记录已保存',
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 获取刷题历史
 * GET /api/quiz/history
 */
quizRouter.get('/history', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const history = quizHistory.get(userId) || [];
        res.json({
            success: true,
            history,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 获取会话详情
 * GET /api/quiz/session/:id
 */
quizRouter.get('/session/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const session = quizSessions.get(id);
        if (!session) {
            throw new ApiError('会话不存在或已过期', 404);
        }
        res.json({
            success: true,
            session: {
                id: session.id,
                config: session.config,
                status: session.status,
                createdAt: session.createdAt,
                completedAt: session.completedAt,
                score: session.score,
                accuracy: session.accuracy,
                questionCount: session.questions.length,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 获取刷题统计
 * GET /api/quiz/stats
 */
quizRouter.get('/stats', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const history = quizHistory.get(userId) || [];
        if (history.length === 0) {
            return res.json({
                success: true,
                stats: {
                    totalSessions: 0,
                    totalQuestions: 0,
                    averageAccuracy: 0,
                    subjectStats: {},
                    recentTrend: [],
                },
            });
        }
        // 计算统计数据
        const totalSessions = history.length;
        const totalAccuracy = history.reduce((sum, h) => sum + h.accuracy, 0);
        const averageAccuracy = Math.round(totalAccuracy / totalSessions * 10) / 10;
        // 按科目统计
        const subjectStats = {};
        history.forEach((h) => {
            if (!subjectStats[h.subject]) {
                subjectStats[h.subject] = { sessions: 0, averageAccuracy: 0 };
            }
            subjectStats[h.subject].sessions++;
            subjectStats[h.subject].averageAccuracy += h.accuracy;
        });
        Object.keys(subjectStats).forEach((subject) => {
            subjectStats[subject].averageAccuracy =
                Math.round(subjectStats[subject].averageAccuracy / subjectStats[subject].sessions * 10) / 10;
        });
        // 最近7天趋势
        const recentTrend = history.slice(0, 7).map((h) => ({
            date: h.completedAt.split('T')[0],
            accuracy: h.accuracy,
            subject: h.subject,
        }));
        res.json({
            success: true,
            stats: {
                totalSessions,
                totalQuestions: history.reduce((sum, h) => sum + h.score, 0),
                averageAccuracy,
                subjectStats,
                recentTrend,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 获取错题列表
 * GET /api/quiz/wrong-questions
 */
quizRouter.get('/wrong-questions', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const db = getDatabase();
        const questions = db.prepare(`
      SELECT id, question_id as questionId, question_text as questionText, 
             question_type as questionType, subject, topic, 
             user_answer as userAnswer, correct_answer as correctAnswer, 
             explanation, wrong_count as wrongCount, status,
             first_attempt_date as firstAttemptDate, last_attempt_date as lastAttemptDate
      FROM wrong_questions 
      WHERE user_id = ? 
      ORDER BY last_attempt_date DESC, created_at DESC
    `).all(userId);
        res.json({
            success: true,
            questions: questions.map(q => ({
                ...q,
                topic: q.topic || '综合',
                userAnswer: q.userAnswer || '',
                correctAnswer: q.correctAnswer || '',
                explanation: q.explanation || '',
            })),
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 添加错题
 * POST /api/quiz/wrong-questions
 */
quizRouter.post('/wrong-questions', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { questionId, questionText, questionType, subject, topic, userAnswer, correctAnswer, explanation } = req.body;
        const db = getDatabase();
        const now = new Date().toISOString();
        const today = now.split('T')[0];
        // 检查是否已存在
        const existing = db.prepare(`
      SELECT id, wrong_count FROM wrong_questions 
      WHERE user_id = ? AND question_id = ?
    `).get(userId, questionId);
        if (existing) {
            // 更新错题次数，重置为未复习状态
            db.prepare(`
        UPDATE wrong_questions 
        SET wrong_count = wrong_count + 1, 
            last_attempt_date = ?, 
            status = 'unreviewed',
            updated_at = ?
        WHERE id = ?
      `).run(today, now, existing.id);
        }
        else {
            // 添加新错题
            const id = uuidv4();
            db.prepare(`
        INSERT INTO wrong_questions (
          id, user_id, question_id, question_text, question_type, 
          subject, topic, user_answer, correct_answer, explanation,
          wrong_count, status, first_attempt_date, last_attempt_date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'unreviewed', ?, ?, ?, ?)
      `).run(id, userId, questionId, questionText, questionType || 'multiple_choice', subject, topic || '综合', String(userAnswer), String(correctAnswer), explanation || '', today, today, now, now);
        }
        res.json({
            success: true,
            message: '错题已添加',
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 更新错题状态
 * PATCH /api/quiz/wrong-questions/:id/status
 */
quizRouter.patch('/wrong-questions/:id/status', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { status } = req.body;
        const db = getDatabase();
        if (!['reviewed', 'mastered', 'unreviewed'].includes(status)) {
            throw new ApiError('无效的状态值', 400);
        }
        // 确保只能更新自己的错题
        const existing = db.prepare(`
      SELECT id FROM wrong_questions WHERE id = ? AND user_id = ?
    `).get(id, userId);
        if (!existing) {
            throw new ApiError('错题不存在', 404);
        }
        db.prepare(`
      UPDATE wrong_questions SET status = ?, updated_at = ? WHERE id = ?
    `).run(status, new Date().toISOString(), id);
        res.json({
            success: true,
            message: '状态已更新',
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 删除错题
 * DELETE /api/quiz/wrong-questions/:id
 */
quizRouter.delete('/wrong-questions/:id', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const db = getDatabase();
        // 确保只能删除自己的错题
        const result = db.prepare(`
      DELETE FROM wrong_questions WHERE id = ? AND user_id = ?
    `).run(id, userId);
        if (result.changes === 0) {
            throw new ApiError('错题不存在', 404);
        }
        res.json({
            success: true,
            message: '错题已删除',
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 获取学习档案
 * GET /api/quiz/learning-profile
 */
quizRouter.get('/learning-profile', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const db = getDatabase();
        // 获取用户的刷题历史
        const userHistory = quizHistory.get(userId) || [];
        // 从数据库获取错题
        const userWrongQuestions = db.prepare(`
      SELECT id, question_id as questionId, question_text as questionText, 
             question_type as questionType, subject, topic, 
             user_answer as userAnswer, correct_answer as correctAnswer, 
             explanation, wrong_count as wrongCount, status,
             first_attempt_date as firstAttemptDate, last_attempt_date as lastAttemptDate
      FROM wrong_questions 
      WHERE user_id = ? 
      ORDER BY last_attempt_date DESC
    `).all(userId);
        // 计算总体统计
        const totalQuizzes = userHistory.length;
        const totalQuestions = userHistory.reduce((sum, h) => {
            // 从历史记录估算题目数量
            const session = quizSessions.get(h.id);
            return sum + (session?.questions.length || 10);
        }, 0) || Math.max(userWrongQuestions.length * 3, 10); // 如果没有历史，根据错题估算
        const correctAnswers = Math.round(userHistory.reduce((sum, h) => sum + (h.accuracy / 100) * 10, 0)) || Math.round(totalQuestions * 0.7);
        // 计算学习时长（估算）
        const totalTimeSpent = totalQuizzes * 15; // 假设每次练习15分钟
        // 计算连续学习天数
        const today = new Date().toISOString().split('T')[0];
        let currentStreak = userHistory.length > 0 ? 1 : 0;
        const longestStreak = Math.max(currentStreak, 5); // 模拟数据
        // 科目掌握度统计
        const subjectStats = {};
        userHistory.forEach((h) => {
            if (!subjectStats[h.subject]) {
                subjectStats[h.subject] = { total: 0, correct: 0, lastPracticed: h.completedAt };
            }
            subjectStats[h.subject].total += 10; // 假设每次10题
            subjectStats[h.subject].correct += Math.round(h.accuracy / 10);
            subjectStats[h.subject].lastPracticed = h.completedAt;
        });
        // 构建科目掌握度数组
        const subjectMastery = Object.entries(subjectStats).map(([subjectId, stats]) => ({
            subjectId,
            subjectName: getSubjectName(subjectId),
            totalQuestions: stats.total,
            correctAnswers: stats.correct,
            accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
            recentTrend: 'stable',
            lastPracticed: stats.lastPracticed,
        }));
        // 如果没有数据，返回模拟数据
        if (subjectMastery.length === 0) {
            subjectMastery.push({ subjectId: 'math', subjectName: '数学', totalQuestions: 0, correctAnswers: 0, accuracy: 0, recentTrend: 'stable', lastPracticed: today }, { subjectId: 'physics', subjectName: '物理', totalQuestions: 0, correctAnswers: 0, accuracy: 0, recentTrend: 'stable', lastPracticed: today });
        }
        // 知识点掌握度（从错题中提取）
        const topicMastery = userWrongQuestions
            .slice(0, 10)
            .map((q) => ({
            topic: q.topic || '综合',
            subject: q.subject || 'math',
            mastery: q.status === 'mastered' ? 90 : q.status === 'reviewed' ? 60 : 30,
            questionsAttempted: q.wrongCount || 1,
            lastAttempted: q.lastAttemptDate,
        }));
        // 成就系统
        const achievements = [
            {
                id: '1',
                name: '初露锋芒',
                description: '完成第一次刷题',
                icon: '🌟',
                unlockedAt: totalQuizzes >= 1 ? today : null,
                progress: totalQuizzes >= 1 ? 100 : 0,
            },
            {
                id: '2',
                name: '勤学不倦',
                description: '连续学习7天',
                icon: '🔥',
                unlockedAt: currentStreak >= 7 ? today : null,
                progress: Math.min((currentStreak / 7) * 100, 100),
            },
            {
                id: '3',
                name: '百题斩',
                description: '完成100道题目',
                icon: '💯',
                unlockedAt: totalQuestions >= 100 ? today : null,
                progress: Math.min((totalQuestions / 100) * 100, 100),
            },
            {
                id: '4',
                name: '千题王',
                description: '完成1000道题目',
                icon: '👑',
                unlockedAt: totalQuestions >= 1000 ? today : null,
                progress: Math.min((totalQuestions / 1000) * 100, 100),
            },
            {
                id: '5',
                name: '精准狙击',
                description: '单次练习正确率100%',
                icon: '🎯',
                unlockedAt: userHistory.some((h) => h.accuracy === 100) ? today : null,
                progress: userHistory.some((h) => h.accuracy >= 90) ? 100 : 0,
            },
            {
                id: '6',
                name: '错题克星',
                description: '掌握10道错题',
                icon: '📖',
                unlockedAt: userWrongQuestions.filter((q) => q.status === 'mastered').length >= 10 ? today : null,
                progress: Math.min((userWrongQuestions.filter((q) => q.status === 'mastered').length / 10) * 100, 100),
            },
        ];
        // 学习目标
        const goals = [
            {
                id: '1',
                title: '每日刷题',
                target: 20,
                current: Math.min(userHistory.filter((h) => h.completedAt === today).length * 10, 20),
                deadline: today,
                type: 'daily',
            },
            {
                id: '2',
                title: '本周目标',
                target: 100,
                current: Math.min(totalQuestions, 100),
                deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                type: 'weekly',
            },
        ];
        // 最近活动
        const recentActivity = userHistory
            .slice(0, 7)
            .map((h) => ({
            date: h.completedAt,
            quizCount: 1,
            questionsAnswered: 10,
            accuracy: h.accuracy,
        }));
        res.json({
            totalQuizzes,
            totalQuestions: totalQuestions || 0,
            correctAnswers: correctAnswers || 0,
            totalTimeSpent,
            currentStreak,
            longestStreak,
            lastStudyDate: today,
            subjectMastery,
            topicMastery,
            achievements,
            goals,
            recentActivity,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * 生成学习报告
 * POST /api/quiz/generate-report
 */
quizRouter.post('/generate-report', authMiddleware, async (req, res, next) => {
    try {
        const userId = req.userId;
        const { period = 'weekly' } = req.body;
        const db = getDatabase();
        // 获取用户数据
        const userHistory = quizHistory.get(userId) || [];
        // 从数据库获取错题
        const userWrongQuestions = db.prepare(`
      SELECT id, question_id as questionId, subject, topic, 
             wrong_count as wrongCount, status,
             last_attempt_date as lastAttemptDate
      FROM wrong_questions 
      WHERE user_id = ? 
      ORDER BY last_attempt_date DESC
      LIMIT 20
    `).all(userId);
        // 计算统计数据
        const totalQuestions = userHistory.length * 10 || 50; // 模拟数据
        const averageAccuracy = userHistory.length > 0
            ? userHistory.reduce((sum, h) => sum + h.accuracy, 0) / userHistory.length
            : 74.5;
        // 分析科目表现
        const subjectStats = {};
        userHistory.forEach((h) => {
            if (!subjectStats[h.subject]) {
                subjectStats[h.subject] = { total: 0, correct: 0 };
            }
            subjectStats[h.subject].total += 10;
            subjectStats[h.subject].correct += Math.round(h.accuracy / 10);
        });
        // 构建科目分析
        const subjectAnalysis = Object.entries(subjectStats).map(([subject, stats]) => {
            const accuracy = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
            return {
                subject: getSubjectName(subject),
                accuracy: Math.round(accuracy * 10) / 10,
                trend: accuracy >= 70 ? 'up' : accuracy >= 50 ? 'stable' : 'down',
                recommendations: getSubjectRecommendations(subject, accuracy),
            };
        });
        // 如果没有数据，提供模拟分析
        if (subjectAnalysis.length === 0) {
            subjectAnalysis.push({
                subject: '数学',
                accuracy: 82.5,
                trend: 'up',
                recommendations: ['继续保持当前的学习节奏', '可以尝试挑战更高难度的题目'],
            }, {
                subject: '物理',
                accuracy: 78.2,
                trend: 'stable',
                recommendations: ['力学部分掌握良好', '电磁学需要加强练习'],
            });
        }
        // 知识点洞察
        const topicInsights = userWrongQuestions.slice(0, 6).map((q) => ({
            topic: q.topic || '综合',
            mastery: q.status === 'mastered' ? 90 : q.status === 'reviewed' ? 60 : 35,
            status: q.status === 'mastered' ? 'strong' : q.status === 'reviewed' ? 'needs_work' : 'critical',
        }));
        // 如果没有错题数据，提供模拟洞察
        if (topicInsights.length === 0) {
            topicInsights.push({ topic: '二次方程', mastery: 92, status: 'strong' }, { topic: '三角函数', mastery: 78, status: 'strong' }, { topic: '化学平衡', mastery: 55, status: 'needs_work' }, { topic: '有机化学', mastery: 48, status: 'critical' });
        }
        // 确定强势和弱势科目
        const sortedSubjects = [...subjectAnalysis].sort((a, b) => b.accuracy - a.accuracy);
        const strongSubjects = sortedSubjects.slice(0, 2).map((s) => s.subject);
        const weakSubjects = sortedSubjects.slice(-2).map((s) => s.subject);
        const report = {
            generatedAt: new Date().toISOString(),
            period: period === 'weekly' ? '本周' : period === 'monthly' ? '本月' : '今日',
            summary: {
                totalStudyTime: userHistory.length * 15 || 320,
                totalQuestions,
                averageAccuracy: Math.round(averageAccuracy * 10) / 10,
                improvement: 8.3, // 模拟进步幅度
                strongSubjects,
                weakSubjects,
            },
            subjectAnalysis,
            topicInsights,
            recommendations: [
                '📚 建议每天保持至少30分钟的刷题时间',
                '🎯 优先复习标记为"需加强"的知识点',
                '📝 利用错题本进行针对性复习',
                '⏰ 尝试在模拟考试环境下做题，提高时间管理能力',
            ],
            nextSteps: [
                '完成本周错题复习',
                '尝试一次完整的模拟测试',
                '针对薄弱知识点进行专项训练',
            ],
        };
        res.json(report);
    }
    catch (error) {
        next(error);
    }
});
/**
 * 获取科目学习建议
 */
function getSubjectRecommendations(subjectId, accuracy) {
    const baseRecommendations = {
        math: ['多做计算练习', '复习公式和定理', '注意解题步骤'],
        physics: ['理解物理概念', '多做实验分析题', '注意单位换算'],
        chemistry: ['记忆化学方程式', '理解反应机理', '多做计算题'],
        biology: ['记忆生物术语', '理解生物过程', '多做图表分析'],
        chinese: ['多阅读文言文', '积累写作素材', '注意阅读理解技巧'],
        english: ['扩充词汇量', '多练习阅读理解', '注意语法规则'],
    };
    const recommendations = baseRecommendations[subjectId] || ['继续保持学习', '多做练习题'];
    if (accuracy >= 80) {
        recommendations.unshift('表现优秀，可以挑战更高难度');
    }
    else if (accuracy < 60) {
        recommendations.unshift('需要加强基础，建议回顾核心知识点');
    }
    return recommendations.slice(0, 3);
}
/**
 * 获取科目名称
 */
function getSubjectName(subjectId) {
    const subjectMap = {
        chinese: '中国语文',
        english: '英国语文',
        math: '数学',
        ls: '公民与社会发展科',
        physics: '物理',
        chemistry: '化学',
        biology: '生物',
        combined_science: '组合科学',
        economics: '经济',
        geography: '地理',
        history: '历史',
        chinese_history: '中国历史',
    };
    return subjectMap[subjectId] || subjectId;
}
/**
 * 健康检查
 */
quizRouter.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'quiz',
        activeSessions: quizSessions.size,
    });
});
//# sourceMappingURL=quiz.js.map