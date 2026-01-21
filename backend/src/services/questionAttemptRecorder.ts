/**
 * 题目级别事实记录服务
 * 
 * 规则：
 * 1. 一道题一次作答 = 一条记录
 * 2. 永远 INSERT，不允许 UPDATE
 * 3. 这是错题本 & 学习档案的唯一"原始事实"
 * 
 * 用途：
 * - 错题本：统计错误次数、错误答案、解析
 * - 学习档案：科目掌握度、知识点掌握度、学习趋势
 */

export type QuestionSourceType = 'QUIZ' | 'LEVEL_TEST' | 'WRONG_REVIEW';

export interface QuestionAttemptInput {
  userId: string;
  
  // 题目信息
  questionId: string;
  questionText?: string;
  questionType?: string;  // 选择题 / 计算题 / 简答题
  subject?: string;
  topic?: string;
  
  // 作答信息
  selectedAnswer?: string;
  correctAnswer?: string;
  isCorrect: boolean;
  
  // 解析 & 时间
  explanation?: string;
  durationSeconds?: number;
  
  // 来源信息
  sourceType: QuestionSourceType;
  sourceId?: string;  // quiz_session_id / level_test_id
}

export interface QuestionAttemptResult {
  success: boolean;
  attemptId?: number;
  error?: string;
}

/**
 * 记录单道题目的作答事实
 * 【关键】永远 INSERT，不允许 UPDATE
 */
export async function recordQuestionAttempt(
  db: D1Database,
  input: QuestionAttemptInput
): Promise<QuestionAttemptResult> {
  try {
    const now = new Date().toISOString();
    
    const result = await db.prepare(`
      INSERT INTO question_attempts (
        user_id,
        question_id,
        question_text,
        question_type,
        subject,
        topic,
        selected_answer,
        correct_answer,
        is_correct,
        explanation,
        duration_seconds,
        source_type,
        source_id,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      input.userId,
      input.questionId,
      input.questionText || null,
      input.questionType || null,
      input.subject || null,
      input.topic || null,
      input.selectedAnswer || null,
      input.correctAnswer || null,
      input.isCorrect ? 1 : 0,
      input.explanation || null,
      input.durationSeconds || 0,
      input.sourceType,
      input.sourceId || null,
      now
    ).run();

    return {
      success: true,
      attemptId: result.meta?.last_row_id as number,
    };
  } catch (error) {
    console.error('Record question attempt error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 批量记录题目作答事实
 * 用于刷题完成时一次性记录所有题目
 */
export async function recordQuestionAttemptsBatch(
  db: D1Database,
  inputs: QuestionAttemptInput[]
): Promise<{ success: boolean; count: number; errors: string[] }> {
  const errors: string[] = [];
  let successCount = 0;

  for (const input of inputs) {
    const result = await recordQuestionAttempt(db, input);
    if (result.success) {
      successCount++;
    } else {
      errors.push(result.error || 'Unknown error');
    }
  }

  return {
    success: errors.length === 0,
    count: successCount,
    errors,
  };
}

// ===== 查询函数（用于错题本 & 学习档案）=====

/**
 * 获取用户错题列表（从原始事实聚合）
 * 【关键】数据来源于 question_attempts，而非 wrong_questions 表
 */
export async function getWrongQuestionsByUser(
  db: D1Database,
  userId: string,
  options?: {
    subject?: string;
    topic?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{
  questions: Array<{
    questionId: string;
    questionText: string;
    questionType: string;
    subject: string;
    topic: string;
    correctAnswer: string;
    explanation: string;
    wrongCount: number;
    lastWrongAnswer: string;
    firstAttemptDate: string;
    lastAttemptDate: string;
  }>;
  total: number;
}> {
  const { subject, topic, limit = 50, offset = 0 } = options || {};
  
  let whereClause = 'WHERE user_id = ? AND is_correct = 0';
  const params: any[] = [userId];
  
  if (subject) {
    whereClause += ' AND subject = ?';
    params.push(subject);
  }
  if (topic) {
    whereClause += ' AND topic = ?';
    params.push(topic);
  }

  // 聚合查询：统计每道题的错误次数和最近错误信息
  const query = `
    SELECT 
      question_id,
      MAX(question_text) as question_text,
      MAX(question_type) as question_type,
      MAX(subject) as subject,
      MAX(topic) as topic,
      MAX(correct_answer) as correct_answer,
      MAX(explanation) as explanation,
      COUNT(*) as wrong_count,
      MAX(selected_answer) as last_wrong_answer,
      MIN(created_at) as first_attempt_date,
      MAX(created_at) as last_attempt_date
    FROM question_attempts
    ${whereClause}
    GROUP BY question_id
    ORDER BY last_attempt_date DESC
    LIMIT ? OFFSET ?
  `;
  
  const results = await db.prepare(query)
    .bind(...params, limit, offset)
    .all<{
      question_id: string;
      question_text: string;
      question_type: string;
      subject: string;
      topic: string;
      correct_answer: string;
      explanation: string;
      wrong_count: number;
      last_wrong_answer: string;
      first_attempt_date: string;
      last_attempt_date: string;
    }>();

  // 获取总数
  const countQuery = `
    SELECT COUNT(DISTINCT question_id) as total
    FROM question_attempts
    ${whereClause}
  `;
  const countResult = await db.prepare(countQuery)
    .bind(...params)
    .first<{ total: number }>();

  return {
    questions: (results.results || []).map(row => ({
      questionId: row.question_id,
      questionText: row.question_text,
      questionType: row.question_type,
      subject: row.subject,
      topic: row.topic,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      wrongCount: row.wrong_count,
      lastWrongAnswer: row.last_wrong_answer,
      firstAttemptDate: row.first_attempt_date,
      lastAttemptDate: row.last_attempt_date,
    })),
    total: countResult?.total || 0,
  };
}

/**
 * 获取用户科目掌握度（从原始事实聚合）
 */
export async function getSubjectMasteryByUser(
  db: D1Database,
  userId: string
): Promise<Array<{
  subject: string;
  totalQuestions: number;
  correctCount: number;
  accuracy: number;
  recentAccuracy: number;  // 最近 7 天
  recentTrend: 'up' | 'down' | 'stable';
  lastPracticed: string;
}>> {
  // 总体统计
  const overallQuery = `
    SELECT 
      subject,
      COUNT(*) as total_questions,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
      MAX(created_at) as last_practiced
    FROM question_attempts
    WHERE user_id = ? AND subject IS NOT NULL
    GROUP BY subject
    ORDER BY total_questions DESC
  `;
  
  const overallResults = await db.prepare(overallQuery)
    .bind(userId)
    .all<{
      subject: string;
      total_questions: number;
      correct_count: number;
      last_practiced: string;
    }>();

  // 最近 7 天统计
  const recentQuery = `
    SELECT 
      subject,
      COUNT(*) as total_questions,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count
    FROM question_attempts
    WHERE user_id = ? 
      AND subject IS NOT NULL
      AND created_at >= datetime('now', '-7 days')
    GROUP BY subject
  `;
  
  const recentResults = await db.prepare(recentQuery)
    .bind(userId)
    .all<{
      subject: string;
      total_questions: number;
      correct_count: number;
    }>();

  // 之前 7 天统计（用于计算趋势）
  const prevQuery = `
    SELECT 
      subject,
      COUNT(*) as total_questions,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count
    FROM question_attempts
    WHERE user_id = ? 
      AND subject IS NOT NULL
      AND created_at >= datetime('now', '-14 days')
      AND created_at < datetime('now', '-7 days')
    GROUP BY subject
  `;
  
  const prevResults = await db.prepare(prevQuery)
    .bind(userId)
    .all<{
      subject: string;
      total_questions: number;
      correct_count: number;
    }>();

  const recentMap = new Map(
    (recentResults.results || []).map(r => [r.subject, r])
  );
  const prevMap = new Map(
    (prevResults.results || []).map(r => [r.subject, r])
  );

  return (overallResults.results || []).map(row => {
    const recent = recentMap.get(row.subject);
    const prev = prevMap.get(row.subject);
    
    const recentAccuracy = recent && recent.total_questions > 0
      ? recent.correct_count / recent.total_questions
      : 0;
    
    const prevAccuracy = prev && prev.total_questions > 0
      ? prev.correct_count / prev.total_questions
      : 0;

    let recentTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recent && prev) {
      const diff = recentAccuracy - prevAccuracy;
      if (diff > 0.05) recentTrend = 'up';
      else if (diff < -0.05) recentTrend = 'down';
    }

    return {
      subject: row.subject,
      totalQuestions: row.total_questions,
      correctCount: row.correct_count,
      accuracy: row.total_questions > 0 ? row.correct_count / row.total_questions : 0,
      recentAccuracy,
      recentTrend,
      lastPracticed: row.last_practiced,
    };
  });
}

/**
 * 获取用户知识点掌握度（从原始事实聚合）
 */
export async function getTopicMasteryByUser(
  db: D1Database,
  userId: string,
  options?: {
    subject?: string;
    limit?: number;
  }
): Promise<Array<{
  topic: string;
  subject: string;
  totalQuestions: number;
  correctCount: number;
  mastery: number;  // 0-100
  lastAttempted: string;
}>> {
  const { subject, limit = 20 } = options || {};
  
  let whereClause = 'WHERE user_id = ? AND topic IS NOT NULL';
  const params: any[] = [userId];
  
  if (subject) {
    whereClause += ' AND subject = ?';
    params.push(subject);
  }

  const query = `
    SELECT 
      topic,
      MAX(subject) as subject,
      COUNT(*) as total_questions,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
      MAX(created_at) as last_attempted
    FROM question_attempts
    ${whereClause}
    GROUP BY topic
    ORDER BY total_questions DESC
    LIMIT ?
  `;
  
  const results = await db.prepare(query)
    .bind(...params, limit)
    .all<{
      topic: string;
      subject: string;
      total_questions: number;
      correct_count: number;
      last_attempted: string;
    }>();

  return (results.results || []).map(row => ({
    topic: row.topic,
    subject: row.subject,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    mastery: row.total_questions > 0 
      ? Math.round((row.correct_count / row.total_questions) * 100) 
      : 0,
    lastAttempted: row.last_attempted,
  }));
}

/**
 * 获取用户最近学习活动（从原始事实聚合）
 */
export async function getRecentActivityByUser(
  db: D1Database,
  userId: string,
  days: number = 7
): Promise<Array<{
  date: string;
  quizCount: number;
  questionsAnswered: number;
  correctCount: number;
  accuracy: number;
}>> {
  const query = `
    SELECT 
      DATE(created_at) as date,
      COUNT(DISTINCT source_id) as quiz_count,
      COUNT(*) as questions_answered,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_count
    FROM question_attempts
    WHERE user_id = ? 
      AND created_at >= datetime('now', '-${days} days')
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
  
  const results = await db.prepare(query)
    .bind(userId)
    .all<{
      date: string;
      quiz_count: number;
      questions_answered: number;
      correct_count: number;
    }>();

  return (results.results || []).map(row => ({
    date: row.date,
    quizCount: row.quiz_count,
    questionsAnswered: row.questions_answered,
    correctCount: row.correct_count,
    accuracy: row.questions_answered > 0 
      ? (row.correct_count / row.questions_answered) * 100 
      : 0,
  }));
}

/**
 * 获取用户学习档案总体统计
 */
export async function getLearningProfileStats(
  db: D1Database,
  userId: string
): Promise<{
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  overallAccuracy: number;
  totalTimeSpent: number;  // 秒
  uniqueSubjects: number;
  uniqueTopics: number;
}> {
  const query = `
    SELECT 
      COUNT(DISTINCT source_id) as total_quizzes,
      COUNT(*) as total_questions,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers,
      SUM(duration_seconds) as total_time_spent,
      COUNT(DISTINCT subject) as unique_subjects,
      COUNT(DISTINCT topic) as unique_topics
    FROM question_attempts
    WHERE user_id = ?
  `;
  
  const result = await db.prepare(query)
    .bind(userId)
    .first<{
      total_quizzes: number;
      total_questions: number;
      correct_answers: number;
      total_time_spent: number;
      unique_subjects: number;
      unique_topics: number;
    }>();

  return {
    totalQuizzes: result?.total_quizzes || 0,
    totalQuestions: result?.total_questions || 0,
    correctAnswers: result?.correct_answers || 0,
    overallAccuracy: result && result.total_questions > 0
      ? (result.correct_answers / result.total_questions) * 100
      : 0,
    totalTimeSpent: result?.total_time_spent || 0,
    uniqueSubjects: result?.unique_subjects || 0,
    uniqueTopics: result?.unique_topics || 0,
  };
}
