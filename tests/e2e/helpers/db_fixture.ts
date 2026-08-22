/**
 * SQLite In-Memory Database Fixture & Schema Initializer for E2E Tests
 */

export interface SubjectRecord {
  id: string;
  name: string;
  created_at: string;
}

export interface ChapterRecord {
  id: string;
  subject_id: string;
  name: string;
  order_index: number;
}

export interface TopicRecord {
  id: string;
  chapter_id: string;
  name: string;
}

export interface QuestionRecord {
  id: string;
  stem: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  subject_id: string;
  chapter_id: string;
  topic_id?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string | null;
  has_image: boolean;
  image_data?: string | null;
  created_at: string;
  updated_at: string;
  options?: OptionRecord[];
  tags?: string[];
}

export interface OptionRecord {
  id: string;
  question_id: string;
  content: string;
  is_correct: boolean;
  order_index: number;
}

export interface TagRecord {
  id: string;
  name: string;
}

export interface BlueprintRecord {
  id: string;
  title: string;
  config_json: string;
  created_at: string;
}

export interface ActiveExamSessionRecord {
  session_id: string;
  exam_title: string;
  mode: 'practice' | 'exam';
  time_limit_minutes?: number | null;
  remaining_seconds?: number | null;
  questions_json: string;
  user_answers_json: string;
  flagged_json: string;
  is_submitted: boolean;
  started_at: string;
  last_updated: string;
}

export interface ExamHistoryRecord {
  id: string;
  session_id: string;
  score: number;
  total_questions: number;
  correct_count: number;
  completed_at: string;
  duration_seconds: number;
  session_data_json: string;
}

export class DbFixture {
  private tables: Map<string, Array<Record<string, any>>> = new Map();
  private inTransaction: boolean = false;
  private transactionSnapshot: Map<string, Array<Record<string, any>>> | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.resetState();
  }

  private resetState(): void {
    this.tables = new Map([
      ['subjects', []],
      ['chapters', []],
      ['topics', []],
      ['questions', []],
      ['options', []],
      ['tags', []],
      ['question_tags', []],
      ['blueprints', []],
      ['active_exam_sessions', []],
      ['exam_history', []],
      ['questions_fts', []]
    ]);
    this.inTransaction = false;
    this.transactionSnapshot = null;
    this.isInitialized = false;
  }

  public async initSchema(): Promise<void> {
    this.resetState();
    this.isInitialized = true;
  }

  public async reset(): Promise<void> {
    this.resetState();
    await this.initSchema();
  }

  public async execute(sql: string, params: any[] = []): Promise<{ rowsAffected: number; insertId?: number }> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    if (upper.startsWith('BEGIN')) {
      this.inTransaction = true;
      this.transactionSnapshot = new Map(
        Array.from(this.tables.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
      );
      return { rowsAffected: 0 };
    }

    if (upper.startsWith('COMMIT')) {
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return { rowsAffected: 0 };
    }

    if (upper.startsWith('ROLLBACK')) {
      if (this.transactionSnapshot) {
        this.tables = this.transactionSnapshot;
      }
      this.inTransaction = false;
      this.transactionSnapshot = null;
      return { rowsAffected: 0 };
    }

    if (upper.startsWith('CREATE TABLE')) {
      const match = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        if (!this.tables.has(tableName)) {
          this.tables.set(tableName, []);
        }
      }
      return { rowsAffected: 0 };
    }

    if (upper.startsWith('INSERT INTO')) {
      const match = trimmed.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const columns = match[2].split(',').map(c => c.trim());
        let table = this.tables.get(tableName);
        if (!table) {
          table = [];
          this.tables.set(tableName, table);
        }

        const row: Record<string, any> = {};
        columns.forEach((col, idx) => {
          row[col] = params[idx] !== undefined ? params[idx] : null;
        });

        table.push(row);

        // Also sync FTS if inserting question
        if (tableName === 'questions') {
          const ftsTable = this.tables.get('questions_fts') || [];
          ftsTable.push({
            id: row.id,
            stem: row.stem || '',
            explanation: row.explanation || ''
          });
          this.tables.set('questions_fts', ftsTable);
        }

        return { rowsAffected: 1 };
      }
    }

    if (upper.startsWith('UPDATE')) {
      const match = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const setClause = match[2];
        const whereClause = match[3];
        const table = this.tables.get(tableName) || [];

        let affected = 0;
        const setPairs = setClause.split(',').map(p => p.trim());

        table.forEach(row => {
          let matches = true;
          if (whereClause) {
            const whereCol = whereClause.split('=')[0].trim();
            const paramVal = params[params.length - 1];
            if (row[whereCol] !== paramVal) matches = false;
          }

          if (matches) {
            affected++;
            setPairs.forEach((pair, pIdx) => {
              const col = pair.split('=')[0].trim();
              row[col] = params[pIdx];
            });
          }
        });

        return { rowsAffected: affected };
      }
    }

    if (upper.startsWith('DELETE FROM')) {
      const match = trimmed.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?$/i);
      if (match) {
        const tableName = match[1].toLowerCase();
        const whereClause = match[2];
        let table = this.tables.get(tableName) || [];
        const initialLen = table.length;

        if (!whereClause) {
          this.tables.set(tableName, []);
          return { rowsAffected: initialLen };
        } else {
          const col = whereClause.split('=')[0].trim();
          const targetVal = params[0];
          table = table.filter(row => row[col] !== targetVal);
          this.tables.set(tableName, table);
          return { rowsAffected: initialLen - table.length };
        }
      }
    }

    return { rowsAffected: 0 };
  }

  public async select<T>(sql: string, params: any[] = []): Promise<T[]> {
    const trimmed = sql.trim();
    const upper = trimmed.toUpperCase();

    const fromMatch = trimmed.match(/FROM\s+([a-zA-Z0-9_]+)/i);
    if (!fromMatch) return [];

    const tableName = fromMatch[1].toLowerCase();
    let rows = this.tables.get(tableName) || [];

    // FTS full text search handling
    if (tableName === 'questions_fts' || upper.includes('MATCH')) {
      const queryParam = params.find(p => typeof p === 'string');
      if (queryParam) {
        const term = queryParam.replace(/[*"']/g, '').toLowerCase();
        rows = rows.filter(r =>
          (r.stem && String(r.stem).toLowerCase().includes(term)) ||
          (r.explanation && String(r.explanation).toLowerCase().includes(term))
        );
      }
    }

    // Basic WHERE filter matching
    if (upper.includes('WHERE')) {
      const whereMatch = trimmed.match(/WHERE\s+([a-zA-Z0-9_.]+)\s*=\s*\?/i);
      if (whereMatch) {
        const col = whereMatch[1].split('.').pop()!;
        const val = params[0];
        rows = rows.filter(r => r[col] === val);
      }
    }

    // Deep clone rows to prevent direct reference mutation
    return JSON.parse(JSON.stringify(rows)) as T[];
  }

  public async transaction<T>(action: (db: DbFixture) => Promise<T>): Promise<T> {
    await this.execute('BEGIN TRANSACTION');
    try {
      const result = await action(this);
      await this.execute('COMMIT');
      return result;
    } catch (err) {
      await this.execute('ROLLBACK');
      throw err;
    }
  }

  public async seedSampleData(): Promise<void> {
    await this.initSchema();

    // Seed Subject
    await this.execute(
      'INSERT INTO subjects (id, name, created_at) VALUES (?, ?, ?)',
      ['sub-math', 'Mathematics', new Date().toISOString()]
    );

    // Seed Chapter
    await this.execute(
      'INSERT INTO chapters (id, subject_id, name, order_index) VALUES (?, ?, ?, ?)',
      ['chap-calc', 'sub-math', 'Calculus', 1]
    );

    // Seed 10 Sample Questions
    for (let i = 1; i <= 10; i++) {
      const qId = `q-seed-${i}`;
      const diff = i <= 3 ? 'easy' : i <= 7 ? 'medium' : 'hard';
      await this.execute(
        'INSERT INTO questions (id, stem, question_type, subject_id, chapter_id, topic_id, difficulty, explanation, has_image, image_data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          qId,
          `Sample Calculus Question #${i}: Solve $\\int x^${i} dx$?`,
          'single_choice',
          'sub-math',
          'chap-calc',
          null,
          diff,
          `Explanation for question ${i}`,
          false,
          null,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );

      // Options
      for (let opt = 1; opt <= 4; opt++) {
        await this.execute(
          'INSERT INTO options (id, question_id, content, is_correct, order_index) VALUES (?, ?, ?, ?, ?)',
          [`opt-${i}-${opt}`, qId, `Option ${opt} content for Q${i}`, opt === 1, opt]
        );
      }
    }
  }

  public async getQuestionCount(): Promise<number> {
    const rows = await this.select<any>('SELECT * FROM questions');
    return rows.length;
  }

  public async close(): Promise<void> {
    this.resetState();
  }
}
