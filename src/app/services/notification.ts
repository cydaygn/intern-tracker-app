import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';

import { DatabaseService } from './database.service';

@Injectable({ providedIn: 'root' })
export class ReminderService {
  private sub?: Subscription;

  constructor(private db: DatabaseService) {}

  start(intervalMinutes: number = 60) {
   
    this.runChecks().catch(console.error);

    
    this.sub = interval(intervalMinutes * 60 * 1000).subscribe(() => {
      this.runChecks().catch(console.error);
    });
  }

  stop() {
    this.sub?.unsubscribe();
  }

  // ————— iç işler —————

  private async runChecks() {
    await this.checkDeadlines();
    await this.checkMissingNotes();
    await this.checkInternEndDates();
  }

  private async ensureNotifyPermission(): Promise<boolean> {
    let ok = await isPermissionGranted();
    if (!ok) {
      const perm = await requestPermission();
      ok = perm === 'granted';
    }
    return ok;
  }

  private alreadyNotified(key: string): boolean {
    const today = new Date().toDateString();
    return localStorage.getItem(`notif_${key}`) === today;
  }

  private markNotified(key: string) {
    localStorage.setItem(`notif_${key}`, new Date().toDateString());
  }

  
  private async checkDeadlines() {
    if (!(await this.ensureNotifyPermission())) return;

    const assignments = await this.db.getAssignments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const THRESHOLD_DAYS = 3;

    for (const a of assignments) {
      if (!a?.due_date || a?.status === 'Completed') continue;
      const diff = this.daysUntil(a.due_date, today);
      if (diff > 0 && diff <= THRESHOLD_DAYS) {
        const key = `deadline_${a.id ?? a.due_date}_${a.intern_id ?? ''}`;
        if (!this.alreadyNotified(key)) {
          await sendNotification({
            title: 'Görev Hatırlatma',
            body: `${a.project_type} teslimine ${diff} gün kaldı.`,
          });
          this.markNotified(key);
        }
      }
    }
  }

private async checkMissingNotes() {
  if (!(await this.ensureNotifyPermission())) return;

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const ymd = `${y}-${m}-${d}`;


  const missingCount = await this.db.countInternsMissingNoteFor(ymd);

  if (missingCount > 0 && !this.alreadyNotified('missingNotes')) {
    await sendNotification({
      title: 'Not Eksik Hatırlatma',
      body: `Bugün ${missingCount} stajyer için not girilmemiş.`,
    });
    this.markNotified('missingNotes');
  }
}

  
  private async checkInternEndDates() {
    if (!(await this.ensureNotifyPermission())) return;

    const interns = await this.db.getInterns();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const intern of interns) {
      if (!intern?.end_date) continue;
      const diff = this.daysUntil(intern.end_date, today);
      if (diff > 0 && diff <= 7) {
        const key = `endDate_${intern.id ?? intern.end_date}`;
        if (!this.alreadyNotified(key)) {
          await sendNotification({
            title: 'Staj Bitiş Hatırlatma',
            body: `${intern.first_name} ${intern.last_name} stajı ${diff} gün sonra bitiyor.`,
          });
          this.markNotified(key);
        }
      }
    }
  }

  
  private daysUntil(ymd: string, ref: Date): number {
    const [Y, M, D] = ymd.split('-').map(Number);
    const due = new Date(Y, M - 1, D, 0, 0, 0, 0);
    const diffMs = due.getTime() - ref.getTime();
    return Math.floor(diffMs / (24 * 60 * 60 * 1000));
  }
}
