import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { DatabaseService, Assignment } from '../../services/database.service';
import { Intern } from '../../models/intern.model';
import { open, message } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';

@Component({
  selector: 'app-assign-project',
  templateUrl: './assign-project.component.html',
  styleUrls: ['./assign-project.component.scss']
})
export class AssignProjectComponent implements OnInit {
  interns: Intern[] = [];

  // Store stable keys; render labels via i18n in template
  projectTypes: string[] = [
    'webDev',
    'mobileApp',
    'dataAnalysis',
    'ai',
    'other'
  ];
  isTauri = typeof (window as any).__TAURI__ !== 'undefined';

  selectedIntern_id: number | null = null;
  selectedProjectType: string | null = null;
  taskDescription = '';

  dueDate: Date | null = null;
  minDate: Date = new Date();

  status = 'Planned';
  pdfDosyasi: File | null = null;

  isLoading = false;
  errorMsg = '';
  lastInsertedId: number | null = null;

  constructor(
    private db: DatabaseService,
    private snackBar: MatSnackBar,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    await this.yukleStajyerler();
  }

  // Dosya seçimi (TAURI)
  async openPdfWithTauri() {
    try {
      if (!this.isTauri) {
        this.snackBar.open(this.translate.instant('assign.messages.onlyTauri'), this.translate.instant('common.ok'), {
          duration: 4000,
          panelClass: ['warning-snackbar'],
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        return;
      }
      const selected = await open({
        multiple: false,
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (!selected || Array.isArray(selected)) return;

      const filePath = selected as string;
      const fileName = filePath.split(/[\\/]/).pop()!;
      const bytes = await readFile(filePath);

    
      const arr = Array.from(bytes);
      const savedPath = `C:/intern_files/projects/${Date.now()}_${fileName}`;
      await this.db.saveFile(savedPath, arr as number[]);

     
      const ab = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab).set(bytes);
      this.pdfDosyasi = new File([ab], fileName, { type: 'application/pdf' });

      this.snackBar.open(this.translate.instant('assign.messages.fileCopied'), this.translate.instant('common.ok'), {
        duration: 3000,
        panelClass: ['success-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
    } catch (err: any) {
      console.error('PDF seçme/kaydetme hatası:', err);
      this.snackBar.open(this.translate.instant('assign.messages.fileError'), this.translate.instant('common.ok'), {
        duration: 5000,
        panelClass: ['error-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
    }
  }

  
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.pdfDosyasi = input.files[0];
      console.log('Seçilen PDF dosyası:', this.pdfDosyasi.name);
    }
  }

  
  clearSelectedFile() {
    this.pdfDosyasi = null;
  }

 
  get selectedFileLabel(): string {
    if (!this.pdfDosyasi) return '';
    const name = this.pdfDosyasi.name;
    const sizeKB = Math.max(1, Math.round(this.pdfDosyasi.size / 1024));
    return `${name} • ${sizeKB} KB`;
  }

  private async yukleStajyerler() {
    this.isLoading = true;
    this.errorMsg = '';
    try {
      await this.db.ensureInitialized();
      this.interns = await this.db.getInterns();
    } catch (e: any) {
      console.error('[ASSIGN] Stajyerleri yükleme hatası:', e);
      this.errorMsg = 'Stajyer listesi yüklenemedi: ' + (e?.message ?? e);
    } finally {
      this.isLoading = false;
    }
  }

  private toYMD(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async ata() {
    console.log('[ASSIGN] Projeyi Ata tıklandı');

    if (!this.selectedIntern_id ||
        !this.selectedProjectType ||
        !this.taskDescription.trim() ||
        !this.dueDate) {
      this.snackBar.open(this.translate.instant('assign.messages.fillRequired'), this.translate.instant('common.ok'), {
        duration: 3000,
        panelClass: ['warning-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      return;
    }

    this.isLoading = true;
    try {
      let savedPath: string | undefined;
      if (this.pdfDosyasi) {
        const arrBuf = await this.pdfDosyasi.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrBuf));
        savedPath = `C:/intern_files/projects/${Date.now()}_${this.pdfDosyasi.name}`;
        await this.db.saveFile(savedPath, bytes);
      }

      const a: Assignment = {
        intern_id: this.selectedIntern_id,
        project_type: this.selectedProjectType!,
        task_description: this.taskDescription.trim(),
        due_date: this.toYMD(this.dueDate),
        status: this.status,
        file_path: savedPath
      };

      const id = await this.db.addAssignment(a);
      this.lastInsertedId = id;
      console.log('[ASSIGN] eklendi id =', id);

      this.snackBar.open(this.translate.instant('assign.messages.assigned'), this.translate.instant('common.ok'), {
        duration: 3000,
        panelClass: ['success-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      this.cancelAssign();
    } catch (e: any) {
      console.error('Proje atama hatası:', e);
      this.snackBar.open(this.translate.instant('assign.messages.assignError'), this.translate.instant('common.ok'), {
        duration: 4000, panelClass: ['error-snackbar'], horizontalPosition: 'center', verticalPosition: 'top'
      });
    } finally {
      this.isLoading = false;
    }
  }

  cancelAssign() {
    this.selectedIntern_id = null;
    this.selectedProjectType = null;
    this.taskDescription = '';
    this.dueDate = null;
    this.status = 'Planned';
    this.pdfDosyasi = null;
  }
}
