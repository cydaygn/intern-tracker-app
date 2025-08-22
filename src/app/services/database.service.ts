// src/app/services/database.service.ts
import { Injectable } from '@angular/core';
import { Intern } from '../models/intern.model';

export interface Assignment {
  id?: number;
  intern_id: number;
  project_type: string;
  task_description: string;
  due_date: string;
  status: string;
  file_path?: string;
  created_at?: string;
}

export interface InternOption {
  id: number;
  name: string;
  status?: string;
}

export interface Evaluation {
  id?: number;
  intern_id: number;
  etiket: string;
  puan: number;
  created_at?: string;
}

export interface InternFiles {
  cv_name?: string | null;
  cv_mime?: string | null;
  cv_blob?: number[] | null;
  photo_name?: string | null;
  photo_mime?: string | null;
  photo_blob?: number[] | null;
   cv_path?: string | null;
  photo_path?: string | null;
}

// Rust tarafıyla uyumlu payload (BLOB meta + veri)
export interface InternPayload {
  first_name: string;
  last_name: string;
  school: string;
  department: string;
  start_date: string;
  end_date?: string | null;
  status: string;
  contact: string;
  email: string;
cv_path?: string | null;
  photo_path?: string | null;
  cv_name?: string | null;
  cv_mime?: string | null;
  cv_blob?: number[] | null;

  photo_name?: string | null;
  photo_mime?: string | null;
  photo_blob?: number[] | null;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private invoke: (<T = any>(cmd: string, args?: any) => Promise<T>) | null = null;

  constructor() {
    this.initTauri();
  }

  private async initTauri() {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const core = await import('@tauri-apps/api/core');
        this.invoke = core.invoke;
        console.log('Tauri API ready');
      } catch (error) {
        console.error('Failed to load Tauri API:', error);
        this.invoke = null;
      }
    } else {
      console.warn('Tauri environment not found');
    }
  }

  private async ensureTauriReady() {
    if (!this.invoke) {
      await this.initTauri();
      if (!this.invoke) throw new Error('Tauri API is not available');
    }
  }

  async ensureInitialized(): Promise<void> {
    await this.ensureTauriReady();
  }

  // ---------- INTERNS ----------

  async addIntern(payload: InternPayload): Promise<number> {
    await this.ensureTauriReady();
    return this.invoke!('add_intern', { intern: payload });
  }

  async updateIntern(id: number, payload: InternPayload): Promise<void> {
    await this.ensureTauriReady();
    return this.invoke!('update_intern', { id, intern: payload });
  }
async saveFile(path: string, data: number[]): Promise<void> {
  await this.ensureTauriReady();
  return this.invoke!('save_file', { path, data });
}
  async getInterns(): Promise<Intern[]> {
    await this.ensureTauriReady();
    return this.invoke!('get_interns_from_db');
  }

  async deleteIntern(id: number): Promise<void> {
    await this.ensureTauriReady();
    return this.invoke!('delete_intern', { id });
  }

  async getInternOptions(): Promise<InternOption[]> {
    const interns = await this.getInterns();
    return (interns ?? []).map(i => ({
      id: i.id as number,
      name: `${i.first_name ?? ''} ${i.last_name ?? ''}`.trim(),
      status: (i as any).status,
    }));
  }

  // BLOB’ları çek (önizleme/etiket için)
  async getInternFiles(intern_id: number): Promise<InternFiles> {
    await this.ensureTauriReady();
    return this.invoke!('get_intern_files', { id: Number(intern_id) });
  }

  // ---------- ASSIGNMENTS ----------

  async addAssignment(a: Assignment): Promise<number> {
    await this.ensureTauriReady();
    return this.invoke!('add_assignment', { a });
  }

  async getAssignments(): Promise<Assignment[]> {
    await this.ensureTauriReady();
    return this.invoke!('get_assignments');
  }

  async deleteAssignment(id: number): Promise<void> {
    await this.ensureTauriReady();
    return this.invoke!('delete_assignment', { id });
  }

  // ---------- EVALUATIONS ----------

  async addEvaluation(internId: number, etiket: string, puan: number): Promise<number> {
    await this.ensureTauriReady();
    const evaluation = {
      intern_id: Number(internId),
      etiket,
      puan: Number(puan),
    };
    return this.invoke!('add_evaluation', { e: evaluation });
  }

  async getEvaluations(internId: number): Promise<Evaluation[]> {
    await this.ensureTauriReady();
    // Rust imzası: get_evaluations(handle, intern_id: i64)
    return this.invoke!('get_evaluations', { internId: Number(internId) });
  }

  async deleteEvaluation(id: number): Promise<void> {
    await this.ensureTauriReady();
    return this.invoke!('delete_evaluation', { id });
  }

  

  async debugSnapshot(): Promise<[string, number]> {
    await this.ensureTauriReady();
    return this.invoke!('debug_db_snapshot');
  }

  async countInternsMissingNoteFor(dateYMD: string): Promise<number> {
    await this.ensureTauriReady();
    return this.invoke!('count_interns_missing_note_for_date', { date: dateYMD });
  }
}
