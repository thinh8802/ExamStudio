/**
 * EM1 E2E Test Harness Sanity Verification Suite
 * Exercises DbFixture, MockTauri, ImportHelper, and sample fixtures.
 */

import { describe, it, expect, beforeEach, afterEach } from './runner.js';
import { DbFixture } from './helpers/db_fixture.js';
import { setupTauriMocks, resetTauriMocks } from './helpers/mock_tauri.js';
import { ImportHelper } from './helpers/import_helper.js';

describe('EM1 Infrastructure - Test Harness Sanity Suite', () => {
  let db: DbFixture;

  beforeEach(async () => {
    db = new DbFixture();
    await db.initSchema();
    setupTauriMocks();
  });

  afterEach(async () => {
    await db.close();
    resetTauriMocks();
  });

  describe('1. Sample Fixture Accessibility', () => {
    it('should read sample_import.json fixture correctly', () => {
      const text = ImportHelper.readFixtureText('sample_import.json');
      expect(text).toContain('q-json-001');
      expect(text).toContain('katex');
      const candidates = ImportHelper.parseJsonFixture(text);
      expect(candidates.length).toBe(3);
    });

    it('should read sample_import.csv fixture correctly', () => {
      const text = ImportHelper.readFixtureText('sample_import.csv');
      expect(text).toContain('derivative');
      const candidates = ImportHelper.parseCsvFixture(text);
      expect(candidates.length).toBeGreaterThanOrEqual(2);
    });

    it('should read sample_import.txt fixture correctly', () => {
      const text = ImportHelper.readFixtureText('sample_import.txt');
      expect(text).toContain('Question 1:');
      const candidates = ImportHelper.parseTxtFixture(text);
      expect(candidates.length).toBe(3);
    });

    it('should read sample_import.docx fixture correctly', () => {
      const buffer = ImportHelper.readFixtureBuffer('sample_import.docx');
      expect(buffer.length).toBeGreaterThan(0);
      const candidates = ImportHelper.parseDocxFixture(buffer);
      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });

    it('should read sample_import.pdf fixture correctly', () => {
      const buffer = ImportHelper.readFixtureBuffer('sample_import.pdf');
      expect(buffer.length).toBeGreaterThan(0);
      const candidates = ImportHelper.parsePdfFixture(buffer);
      expect(candidates.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. DbFixture SQLite Operations', () => {
    it('should seed sample data and query questions', async () => {
      await db.seedSampleData();
      const count = await db.getQuestionCount();
      expect(count).toBe(10);

      const mathQuestions = await db.select<any>('SELECT * FROM questions WHERE subject_id = ?', ['sub-math']);
      expect(mathQuestions.length).toBe(10);
    });

    it('should handle transactions and rollbacks correctly', async () => {
      await db.seedSampleData();
      try {
        await db.transaction(async (txDb) => {
          await txDb.execute(
            'INSERT INTO questions (id, stem, question_type, subject_id, chapter_id, difficulty, has_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['q-trans-1', 'Tx Stem', 'single_choice', 'sub-math', 'chap-calc', 'easy', false, 'now', 'now']
          );
          throw new Error('Simulated transaction failure');
        });
      } catch (e: any) {
        expect(e.message).toBe('Simulated transaction failure');
      }

      const count = await db.getQuestionCount();
      expect(count).toBe(10); // Rolled back, count remains 10
    });
  });

  describe('3. Mock Tauri IPC Plugin Suite', () => {
    it('should handle filesystem mock operations', async () => {
      const harness = setupTauriMocks({ 'config.json': '{"theme":"dark"}' });
      const exists = await harness.fs.exists('config.json');
      expect(exists).toBe(true);
      const content = await harness.fs.readTextFile('config.json');
      expect(content).toContain('dark');
    });

    it('should handle SQL mock plugin execution', async () => {
      const harness = setupTauriMocks();
      await harness.sql.execute(
        'INSERT INTO subjects (id, name, created_at) VALUES (?, ?, ?)',
        ['sub-phys', 'Physics', new Date().toISOString()]
      );
      const rows = await harness.sql.select<any>('SELECT * FROM subjects WHERE id = ?', ['sub-phys']);
      expect(rows.length).toBe(1);
      expect(rows[0].name).toBe('Physics');
    });
  });

  describe('4. Import Pipeline Validation & Commit', () => {
    it('should validate parsed candidates and commit to SQLite', async () => {
      const jsonText = ImportHelper.readFixtureText('sample_import.json');
      const candidates = ImportHelper.parseJsonFixture(jsonText);
      const committedCount = await ImportHelper.commitImportCandidates(db, candidates);
      expect(committedCount).toBe(3);

      const dbCount = await db.getQuestionCount();
      expect(dbCount).toBe(3);
    });
  });
});
