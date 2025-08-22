import {
  Component, EventEmitter, Output, AfterViewInit, ViewChild,
  ElementRef, OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDatepicker } from '@angular/material/datepicker';
import { formatDate } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { Intern } from '../../models/intern.model';

import { desktopDir, join } from '@tauri-apps/api/path';

@Component({
  selector: 'app-intern-form',
  templateUrl: './intern-form.component.html',
  styleUrls: ['./intern-form.component.scss'],
})
export class InternFormComponent implements OnInit, AfterViewInit {
  @Output() cancel = new EventEmitter<void>();
  @Output() formSubmit = new EventEmitter<any>();

  isTauri = typeof (window as any).__TAURI__ !== 'undefined';
  private isInitialized = false;

  isUpdateMode = false;
  showSelectDialog = false;
  allInterns: Intern[] = [];

  intern: any = {
    id: undefined,
    first_name: '',
    last_name: '',
    school: '',
    department: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    status: 'aktif',
    contact: '',
    email: '',

    // diske kaydedilecek yollar (DB’de saklanır)
    cv_path: null as string | null,
    photo_path: null as string | null,

    // kullanıcıdan seçilen dosyalar (önizleme yok)
    cvFile: null as File | null,
    photoFile: null as File | null,

    // etiket amaçlı
    cv_name: null as string | null,
    photo_name: null as string | null,
  };

  @ViewChild('pickerStart') pickerStart!: MatDatepicker<Date>;
  @ViewChild('pickerEnd') pickerEnd!: MatDatepicker<Date>;
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cvInput') cvInput!: ElementRef<HTMLInputElement>;

  constructor(
    private router: Router,
    private dbService: DatabaseService
  ) {}

  acceptImg: string[] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
  acceptCv: string[] = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  maxSizeMB = 10;

  goBack() { this.router.navigate(['/dashboard']); }

  async ngOnInit() {
    try {
      await this.dbService.ensureInitialized();
      this.isInitialized = true;
    } catch {
      this.isInitialized = false;
    }
  }

  ngAfterViewInit() {}

  // -------- yardımcılar --------
  private sanitizeName(name: string) {
    return (name || 'file').replace(/[^\w.\- ()]/g, '_');
  }
  private fullNameSlug() {
    const fn = (this.intern.first_name || '').trim().replace(/\s+/g, '_');
    const ln = (this.intern.last_name  || '').trim().replace(/\s+/g, '_');
    return this.sanitizeName(`${fn}_${ln}` || 'noname');
  }
  private async fileToBytes(file: File): Promise<number[]> {
    const buf = await file.arrayBuffer();
    return Array.from(new Uint8Array(buf));
  }
  private async buildInternFolder(id: number) {
    const desktop = await desktopDir();
    return await join(desktop, 'InternTracker', 'interns', `${id}_${this.fullNameSlug()}`);
  }

  // -------- stajyer seç/güncelle --------
  async openSelectIntern() {
    this.allInterns = await this.dbService.getInterns();
    this.showSelectDialog = true;
  }
  async selectInternToUpdate(selected: any) {
    this.intern = { ...selected };
    this.isUpdateMode = true;
    this.showSelectDialog = false;

    if (!this.intern.id) return;
    const files = await this.dbService.getInternFiles(this.intern.id);

    // sadece etiket ve varsa mevcut yollar
    this.intern.cv_path    = files.cv_path || null;
    this.intern.photo_path = files.photo_path || null;
    this.intern.cv_name    = files.cv_name || null;
    this.intern.photo_name = files.photo_name || null;

    // yeni seçim olmadıkça diske yazmayacağız
    this.intern.cvFile = null;
    this.intern.photoFile = null;
  }

  // -------- dosya seçiciler --------
  openPhotoWithTauri() { this.photoInput?.nativeElement.click(); }
  openCvWithTauri()    { this.cvInput?.nativeElement.click(); }

  async onPhotoInputChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;

    if (!this.acceptImg.includes(file.type)) { alert('PNG/JPG/WEBP/GIF seçin.'); input.value=''; return; }
    if (file.size > this.maxSizeMB * 1024 * 1024) { alert(`Foto ${this.maxSizeMB} MB üstünde olamaz.`); input.value=''; return; }

    this.intern.photoFile = file;
    this.intern.photo_name = this.sanitizeName(file.name);
    this.intern.photo_path = null; // yeni dosya seçildi
  }

  onCvInputChange(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0]; if (!file) return;

    if (!this.acceptCv.includes(file.type)) { alert('PDF/DOC/DOCX seçin.'); input.value=''; return; }
    if (file.size > this.maxSizeMB * 1024 * 1024) { alert(`CV ${this.maxSizeMB} MB üstünde olamaz.`); input.value=''; return; }

    this.intern.cvFile = file;
    this.intern.cv_name = this.sanitizeName(file.name);
    this.intern.cv_path = null; // yeni dosya seçildi
  }

  // -------- kaydet --------
  onFormSubmit(e: Event) { e.preventDefault(); this.saveIntern(); }
  onSubmitClick() { this.saveIntern(); }

  async saveIntern() {
    if (!this.intern.first_name || !this.intern.last_name || !this.intern.school || !this.intern.start_date) {
      alert('Lütfen zorunlu alanları doldurun!'); return;
    }
    if (!this.isInitialized) { alert('Database servisi hazır değil!'); return; }

    try {
      const basePayload: any = {
        first_name: (this.intern.first_name ?? '').trim(),
        last_name:  (this.intern.last_name  ?? '').trim(),
        school:     (this.intern.school     ?? '').trim(),
        department: (this.intern.department ?? '').trim(),
        start_date: this.intern.start_date ? formatDate(this.intern.start_date, 'yyyy-MM-dd', 'en-US') : '',
        end_date:   this.intern.end_date   ? formatDate(this.intern.end_date, 'yyyy-MM-dd', 'en-US')   : null,
        status:     (this.intern.status     ?? '').trim(),
        contact:    (this.intern.contact    ?? '').trim(),
        email:      (this.intern.email      ?? '').trim(),
        cv_path:    this.intern.cv_path ?? null,
        photo_path: this.intern.photo_path ?? null,
        cv_name:    this.intern.cv_name ?? null,
        photo_name: this.intern.photo_name ?? null,
      };

      if (this.isUpdateMode && this.intern.id) {
        const id = Number(this.intern.id);
        const folder = await this.buildInternFolder(id);

        if (this.intern.photoFile) {
          const ext = (this.intern.photoFile.name.split('.').pop() || 'jpg');
          const path = await join(folder, `photo.${ext}`);
          const bytes = await this.fileToBytes(this.intern.photoFile);
          await this.dbService.saveFile(path, bytes);
          basePayload.photo_path = path;
          basePayload.photo_name = this.sanitizeName(this.intern.photoFile.name);
        }

        if (this.intern.cvFile) {
          const ext = (this.intern.cvFile.name.split('.').pop() || 'pdf');
          const path = await join(folder, `cv.${ext}`);
          const bytes = await this.fileToBytes(this.intern.cvFile);
          await this.dbService.saveFile(path, bytes);
          basePayload.cv_path = path;
          basePayload.cv_name = this.sanitizeName(this.intern.cvFile.name);
        }

        await this.dbService.updateIntern(id, basePayload);
        alert('Stajyer güncellendi!');
      } else {
        // önce kaydı oluşturup id al
        const newId = await this.dbService.addIntern({ ...basePayload, cv_path: null, photo_path: null });
        const folder = await this.buildInternFolder(newId);

        if (this.intern.photoFile) {
          const ext = (this.intern.photoFile.name.split('.').pop() || 'jpg');
          const path = await join(folder, `photo.${ext}`);
          const bytes = await this.fileToBytes(this.intern.photoFile);
          await this.dbService.saveFile(path, bytes);
          basePayload.photo_path = path;
          basePayload.photo_name = this.sanitizeName(this.intern.photoFile.name);
        }

        if (this.intern.cvFile) {
          const ext = (this.intern.cvFile.name.split('.').pop() || 'pdf');
          const path = await join(folder, `cv.${ext}`);
          const bytes = await this.fileToBytes(this.intern.cvFile);
          await this.dbService.saveFile(path, bytes);
          basePayload.cv_path = path;
          basePayload.cv_name = this.sanitizeName(this.intern.cvFile.name);
        }

        // yolları DB’ye yaz
        await this.dbService.updateIntern(newId, basePayload);
        alert('Stajyer eklendi!');
      }

      await this.router.navigate(['/dashboard/intern-list']);
      setTimeout(() => window.dispatchEvent(new Event('force-refresh')), 50);
    } catch (err: any) {
      console.error('Stajyer kaydetme hatası:', err);
      alert('İşlem sırasında hata: ' + (err?.message ?? err));
    }
  }
}
