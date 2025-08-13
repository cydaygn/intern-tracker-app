import { Component, OnInit } from '@angular/core';
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

  projectTypes: string[] = [
    'Web Geliştirme',
    'Mobil Uygulama',
    'Veri Analizi',
    'Yapay Zeka',
    'Diğer'
  ];
  isTauri = typeof (window as any).__TAURI__ !== 'undefined';

  selectedInternId: number | null = null;
  selectedProjectType: string | null = null;
  taskDescription = '';

  dueDate: Date | null = null;
  minDate: Date = new Date();

  status = 'Planned';
  pdfDosyasi: File | null = null;

  isLoading = false;
  errorMsg = '';
  lastInsertedId: number | null = null;

  constructor(private db: DatabaseService) {}

  async ngOnInit() {
    await this.yukleStajyerler();
  }

  // Dosya seçimi (TAURI)
  async openPdfWithTauri() {
    try {
      if (!this.isTauri) {
        alert('Bu buton Tauri penceresinde çalışır. Web için dosya inputunu kullanın.');
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
      await this.db.saveFile(savedPath, arr);

     
      const ab = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab).set(bytes);
      this.pdfDosyasi = new File([ab], fileName, { type: 'application/pdf' });

      await message('Dosya kopyalandı.', { title: 'Bilgi', kind: 'info' });
    } catch (err: any) {
      console.error('PDF seçme/kaydetme hatası:', err);
      alert(`Dosya işlemi başarısız: ${err?.message ?? err}`);
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

    if (!this.selectedInternId ||
        !this.selectedProjectType ||
        !this.taskDescription.trim() ||
        !this.dueDate) {
      alert('Lütfen tüm zorunlu alanları doldurun!');
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
        intern_id: this.selectedInternId,
        project_type: this.selectedProjectType!,
        task_description: this.taskDescription.trim(),
        due_date: this.toYMD(this.dueDate),
        status: this.status,
        file_path: savedPath
      };

      const id = await this.db.addAssignment(a);
      this.lastInsertedId = id;
      console.log('[ASSIGN] eklendi id =', id);

      alert('Proje başarıyla atandı!');
      this.cancelAssign();
    } catch (e: any) {
      console.error('Proje atama hatası:', e);
      alert('Proje atanamadı: ' + (e?.message ?? e));
    } finally {
      this.isLoading = false;
    }
  }

  cancelAssign() {
    this.selectedInternId = null;
    this.selectedProjectType = null;
    this.taskDescription = '';
    this.dueDate = null;
    this.status = 'Planned';
    this.pdfDosyasi = null;
  }
}
