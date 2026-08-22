-- Foreign Keys Enforcement
PRAGMA foreign_keys = ON;

-- 1. Subjects
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Chapters
CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY NOT NULL,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(subject_id, name)
);

CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);

-- 3. Topics
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY NOT NULL,
    chapter_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    UNIQUE(chapter_id, name)
);

CREATE INDEX IF NOT EXISTS idx_topics_chapter_id ON topics(chapter_id);

-- 4. Questions
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY NOT NULL,
    stem TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK(question_type IN ('single_choice', 'multiple_choice', 'true_false')),
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    topic_id TEXT,
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK(difficulty IN ('easy', 'medium', 'hard')),
    explanation TEXT,
    has_image INTEGER NOT NULL DEFAULT 0 CHECK(has_image IN (0, 1)),
    image_data TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE RESTRICT,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter_id ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);

-- 5. Options
CREATE TABLE IF NOT EXISTS options (
    id TEXT PRIMARY KEY NOT NULL,
    question_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0 CHECK(is_correct IN (0, 1)),
    order_index INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_options_question_id ON options(question_id);

-- 6. Tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- 7. Question Tags Junction
CREATE TABLE IF NOT EXISTS question_tags (
    question_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (question_id, tag_id),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_question_tags_tag_id ON question_tags(tag_id);

-- 8. Blueprints
CREATE TABLE IF NOT EXISTS blueprints (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    subject_id TEXT,
    total_questions INTEGER NOT NULL CHECK(total_questions > 0),
    time_limit_minutes INTEGER CHECK(time_limit_minutes IS NULL OR time_limit_minutes > 0),
    rules_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_blueprints_subject_id ON blueprints(subject_id);

-- 9. Active Exam Sessions
CREATE TABLE IF NOT EXISTS active_exam_sessions (
    session_id TEXT PRIMARY KEY NOT NULL,
    exam_title TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('practice', 'exam')),
    time_limit_minutes INTEGER,
    remaining_seconds INTEGER,
    questions_json TEXT NOT NULL,
    user_answers_json TEXT NOT NULL DEFAULT '{}',
    flagged_questions_json TEXT NOT NULL DEFAULT '{}',
    is_submitted INTEGER NOT NULL DEFAULT 0 CHECK(is_submitted IN (0, 1)),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_last_updated ON active_exam_sessions(last_updated);
CREATE INDEX IF NOT EXISTS idx_active_sessions_submitted ON active_exam_sessions(is_submitted);

-- 10. Exam History
CREATE TABLE IF NOT EXISTS exam_history (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT,
    exam_title TEXT NOT NULL,
    mode TEXT NOT NULL CHECK(mode IN ('practice', 'exam')),
    score REAL NOT NULL,
    total_questions INTEGER NOT NULL CHECK(total_questions > 0),
    correct_count INTEGER NOT NULL CHECK(correct_count >= 0),
    time_spent_seconds INTEGER NOT NULL CHECK(time_spent_seconds >= 0),
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    detail_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_exam_history_completed_at ON exam_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_exam_history_mode ON exam_history(mode);

-- 11. Full-Text Search Virtual Table (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
    stem,
    explanation,
    content='questions',
    content_rowid='rowid'
);

-- FTS Triggers for Automatic Synchronization
CREATE TRIGGER IF NOT EXISTS questions_ai AFTER INSERT ON questions BEGIN
    INSERT INTO questions_fts(rowid, stem, explanation) VALUES (new.rowid, new.stem, COALESCE(new.explanation, ''));
END;

CREATE TRIGGER IF NOT EXISTS questions_ad AFTER DELETE ON questions BEGIN
    INSERT INTO questions_fts(questions_fts, rowid, stem, explanation) VALUES('delete', old.rowid, old.stem, COALESCE(old.explanation, ''));
END;

CREATE TRIGGER IF NOT EXISTS questions_au AFTER UPDATE ON questions BEGIN
    INSERT INTO questions_fts(questions_fts, rowid, stem, explanation) VALUES('delete', old.rowid, old.stem, COALESCE(old.explanation, ''));
    INSERT INTO questions_fts(rowid, stem, explanation) VALUES (new.rowid, new.stem, COALESCE(new.explanation, ''));
END;

-- Timestamp Triggers
CREATE TRIGGER IF NOT EXISTS trg_subjects_updated_at AFTER UPDATE ON subjects BEGIN
    UPDATE subjects SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_chapters_updated_at AFTER UPDATE ON chapters BEGIN
    UPDATE chapters SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_topics_updated_at AFTER UPDATE ON topics BEGIN
    UPDATE topics SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_questions_updated_at AFTER UPDATE ON questions BEGIN
    UPDATE questions SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_blueprints_updated_at AFTER UPDATE ON blueprints BEGIN
    UPDATE blueprints SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_active_exam_sessions_updated_at AFTER UPDATE ON active_exam_sessions BEGIN
    UPDATE active_exam_sessions SET last_updated = datetime('now') WHERE session_id = new.session_id;
END;
