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
}

export interface Evaluation {
  id?: number;
  intern_id: number;
  etiket: string;   
  puan: number;     
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private invoke: (<T = any>(cmd: string, args?: any) => Promise<T>) | null = null;

  constructor() { this.initTauri(); }

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

  async saveFile(path: string, data: number[]): Promise<void> {
    await this.ensureTauriReady();
    return this.invoke!('save_file', { path, data });
  }

  // ----- INTERNS -----

  async addIntern(intern: Intern): Promise<number> {
    await this.ensureTauriReady();
    return this.invoke!('add_intern', { intern });
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
    }));
  }

  // ----- ASSIGNMENTS -----

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

  // ----- EVALUATIONS -----

  async addEvaluation(intern_id: number, etiket: string, puan: number): Promise<number> {
    await this.ensureTauriReady();
    // Fix: Match the Rust function parameter name exactly
    const evaluation = { 
      intern_id: Number(intern_id), 
      etiket, 
      puan: Number(puan) 
    };
    console.log('[DB] add_evaluation payload =', { e: evaluation });
    return this.invoke!('add_evaluation', { e: evaluation });
  }

  async getEvaluations(intern_id: number): Promise<Evaluation[]> {
    await this.ensureTauriReady();
    console.log('[DB] getEvaluations called with intern_id:', intern_id);
    // Use camelCase to match what Tauri expects in Rust
    const result = await this.invoke!('get_evaluations', { internId: Number(intern_id) });
    console.log('[DB] getEvaluations result:', result);
    return result;
  }

  async deleteEvaluation(id: number): Promise<void> {
    await this.ensureTauriReady();
    return this.invoke!('delete_evaluation', { id });
  }

  // ----- Utils -----

  async debugSnapshot(): Promise<[string, number]> {
    await this.ensureTauriReady();
    return this.invoke!('debug_db_snapshot');
  }

  async countInternsMissingNoteFor(dateYMD: string): Promise<number> {
    await this.ensureTauriReady();
    return this.invoke!('count_interns_missing_note_for_date', { date: dateYMD });
  }
}