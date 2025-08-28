import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database.service';
import { Intern } from '../../models/intern.model';

export interface InternListItem {
  id: number;
  name: string;
  status?: 'aktif' | 'tamamlandı' | 'pasif' | string;
}

@Component({
  selector: 'app-evaluations-list',
  templateUrl: './evaluations-list.component.html',
  styleUrls: ['./evaluations-list.component.scss']
})
export class EvaluationsListComponent implements OnInit {
  interns: InternListItem[] = [];
  isLoading = false;
  errorMsg = '';

  constructor(
    private router: Router,
    private db: DatabaseService
  ) {}

  async ngOnInit() {
    await this.loadInterns();
  }
 private titleCaseSpaces(text: string): string {
  return (text ?? '').replace(/(^|\s)(\p{L})/gu, (_, space, ch) =>
    space + ch.toLocaleUpperCase('tr-TR')
  );
}
  async loadInterns() {
    this.isLoading = true;
    this.errorMsg = '';
    try {
      await this.db.ensureInitialized();
      const rows: Intern[] = await this.db.getInterns();

      this.interns = (rows ?? [])
        .filter(i => i?.id != null)
        .map((i: any) => {
          const status = i.status ?? i.state ?? undefined;

          return {
            id: Number(i.id),
            name: this.titleCaseSpaces(`${i.first_name ?? ''} ${i.last_name ?? ''}`.trim() || '(İsimsiz)'),
            status
          } as InternListItem;
        });

      console.log('[EVALUATIONS LIST] stajyer sayısı:', this.interns.length);
    } catch (e: any) {
      console.error('[EVALUATIONS LIST] yükleme hatası:', e);
      this.errorMsg = 'Stajyer listesi yüklenemedi: ' + (e?.message ?? e);
      this.interns = [];
    } finally {
      this.isLoading = false;
    }
  }

  showDetails(id: number) {
    this.router.navigate(['/dashboard/evaluations', id]);
  }
}
