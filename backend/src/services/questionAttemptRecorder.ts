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

// ===== 错题状态类型 =====

export type WrongQuestionStatus = 'UNREVIEWED' | 'REVIEWED' | 'MASTERED';

export interface WrongQuestionItem {
  id: string;
  questionText: string;
  questionType: string;
  subject: string;
  topic: string;
  userAnswer: string;
  correctAnswer: string;
  explanation: string;
  wrongCount: number;
  status: WrongQuestionStatus;
  firstAttemptDate: string;
  lastAttemptDate: string;
}

export interface WrongQuestionsResponse {
  stats: {
    total: number;
    unreviewed: number;
    reviewed: number;
    mastered: number;
  };
  items: WrongQuestionItem[];
}

// ===== 查询函数（用于错题本 & 学习档案）=====

/**
 * 获取用户错题列表（从原始事实聚合）
 * 
 * 【数据来源】
 * - question_attempts: 题目作答事实
 * - wrong_question_status: 用户标记的状态
 * 
 * 【返回结构完全对齐前端】
 */
export async function getWrongQuestionsByUser(
  db: D1Database,
  userId: string,
  options?: {
    subject?: string;
    topic?: string;
    status?: WrongQuestionStatus;
    limit?: number;
    offset?: number;
  }
): Promise<WrongQuestionsResponse> {
  const { subject, topic, status, limit = 100, offset = 0 } = options || {};
  
  // 构建筛选条件
  let whereClause = 'WHERE qa.user_id = ? AND qa.is_correct = 0';
  const params: any[] = [userId];
  
  if (subject) {
    whereClause += ' AND qa.subject = ?';
    params.push(subject);
  }
  if (topic) {
    whereClause += ' AND qa.topic = ?';
    params.push(topic);
  }

  // 聚合查询：从 question_attempts 聚合 + 从 wrong_question_status 获取状态
  const query = `
    SELECT 
      qa.question_id,
      MAX(qa.question_text) as question_text,
      MAX(qa.question_type) as question_type,
      MAX(qa.subject) as subject,
      MAX(qa.topic) as topic,
      MAX(qa.selected_answer) as user_answer,
      MAX(qa.correct_answer) as correct_answer,
      MAX(qa.explanation) as explanation,
      COUNT(*) as wrong_count,
      MIN(qa.created_at) as first_attempt_date,
      MAX(qa.created_at) as last_attempt_date,
      COALESCE(wqs.status, 'UNREVIEWED') as status
    FROM question_attempts qa
    LEFT JOIN wrong_question_status wqs 
      ON wqs.user_id = qa.user_id AND wqs.question_id = qa.question_id
    ${whereClause}
    GROUP BY qa.question_id
    ${status ? `HAVING COALESCE(wqs.status, 'UNREVIEWED') = '${status}'` : ''}
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
      user_answer: string;
      correct_answer: string;
      explanation: string;
      wrong_count: number;
      first_attempt_date: string;
      last_attempt_date: string;
      status: string;
    }>();

  // 获取统计数据（不受 status 筛选影响）
  const statsQuery = `
    SELECT 
      COUNT(DISTINCT qa.question_id) as total,
      COUNT(DISTINCT CASE WHEN COALESCE(wqs.status, 'UNREVIEWED') = 'UNREVIEWED' THEN qa.question_id END) as unreviewed,
      COUNT(DISTINCT CASE WHEN wqs.status = 'REVIEWED' THEN qa.question_id END) as reviewed,
      COUNT(DISTINCT CASE WHEN wqs.status = 'MASTERED' THEN qa.question_id END) as mastered
    FROM question_attempts qa
    LEFT JOIN wrong_question_status wqs 
      ON wqs.user_id = qa.user_id AND wqs.question_id = qa.question_id
    WHERE qa.user_id = ? AND qa.is_correct = 0
    ${subject ? `AND qa.subject = '${subject}'` : ''}
    ${topic ? `AND qa.topic = '${topic}'` : ''}
  `;
  
  const statsResult = await db.prepare(statsQuery)
    .bind(userId)
    .first<{
      total: number;
      unreviewed: number;
      reviewed: number;
      mastered: number;
    }>();

  return {
    stats: {
      total: statsResult?.total || 0,
      unreviewed: statsResult?.unreviewed || 0,
      reviewed: statsResult?.reviewed || 0,
      mastered: statsResult?.mastered || 0,
    },
    items: (results.results || []).map(row => ({
      id: row.question_id,
      questionText: row.question_text || '',
      questionType: row.question_type || 'multiple_choice',
      subject: row.subject || '',
      topic: row.topic || '',
      userAnswer: row.user_answer || '',
      correctAnswer: row.correct_answer || '',
      explanation: row.explanation || '',
      wrongCount: row.wrong_count,
      status: (row.status as WrongQuestionStatus) || 'UNREVIEWED',
      firstAttemptDate: row.first_attempt_date,
      lastAttemptDate: row.last_attempt_date,
    })),
  };
}

/**
 * 更新错题状态（用户主动标记）
 */
export async function updateWrongQuestionStatus(
  db: D1Database,
  userId: string,
  questionId: string,
  status: WrongQuestionStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString();
    
    await db.prepare(`
      INSERT INTO wrong_question_status (user_id, question_id, status, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, question_id) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at
    `).bind(userId, questionId, status, now).run();

    return { success: true };
  } catch (error) {
    console.error('Update wrong question status error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 批量更新错题状态
 */
export async function updateWrongQuestionStatusBatch(
  db: D1Database,
  userId: string,
  questionIds: string[],
  status: WrongQuestionStatus
): Promise<{ success: boolean; count: number }> {
  let count = 0;
  
  for (const questionId of questionIds) {
    const result = await updateWrongQuestionStatus(db, userId, questionId, status);
    if (result.success) count++;
  }
  
  return { success: count === questionIds.length, count };
}

/**
 * 删除错题状态（用于重置）
 */
export async function deleteWrongQuestionStatus(
  db: D1Database,
  userId: string,
  questionId: string
): Promise<{ success: boolean }> {
  try {
    await db.prepare(`
      DELETE FROM wrong_question_status
      WHERE user_id = ? AND question_id = ?
    `).bind(userId, questionId).run();
    
    return { success: true };
  } catch (error) {
    console.error('Delete wrong question status error:', error);
    return { success: false };
  }
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
