import {
  Component, EventEmitter, Output, AfterViewInit, ViewChild,
  ElementRef, OnInit, OnDestroy
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDatepicker } from '@angular/material/datepicker';
import { formatDate } from '@angular/common';
import { DatabaseService } from '../../services/database.service';
import { Intern } from '../../models/intern.model';
import { open, message } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
@Component({
  selector: 'app-intern-form',
  templateUrl: './intern-form.component.html',
  styleUrls: ['./intern-form.component.scss'],
})
export class InternFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() cancel = new EventEmitter<void>();
  @Output() formSubmit = new EventEmitter<any>();
isTauri = typeof (window as any).__TAURI__ !== 'undefined';
photoPreviewUrl: string | null = null;
  private isInitialized = false;

  intern = {
    first_name: '',
    last_name: '',
    school: '',
    department: '',
    start_date: null as Date | null,
    end_date: null as Date | null,
    status: 'aktif', 
    contact: '',
    email: '',
    cvFile: null as File | null,
    photoFile: null as File | null,
  };

  @ViewChild('pickerStart') pickerStart!: MatDatepicker<Date>;
  @ViewChild('pickerEnd') pickerEnd!: MatDatepicker<Date>;
  @ViewChild('startInput', { read: ElementRef }) startInput!: ElementRef<HTMLInputElement>;
  @ViewChild('endInput',   { read: ElementRef }) endInput!:   ElementRef<HTMLInputElement>;
  
  constructor(private router: Router, private dbService: DatabaseService) {}

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
      console.log('Database service ready!');
    } catch (err) {
      console.error('Database service failed to init:', err);
      this.isInitialized = false;
    }
  }
 
  ngAfterViewInit() {
    const adjust = (picker: MatDatepicker<Date>, inputRef: ElementRef<HTMLInputElement>) => {
      picker.openedStream.subscribe(() => {
        setTimeout(() => {
          const overlay = document.querySelector('.custom-datepicker .mat-datepicker-content') as HTMLElement;
          if (!overlay) return;
          const rect = inputRef.nativeElement.getBoundingClientRect();
          overlay.style.position = 'fixed';
          overlay.style.top = `${rect.bottom + window.scrollY + 4}px`;
          overlay.style.left = `${rect.left + window.scrollX}px`;
          overlay.style.zIndex = '2100';
          overlay.style.width = `${rect.width}px`;
        }, 0);
      });
    };
    if (this.pickerStart && this.startInput) adjust(this.pickerStart, this.startInput);
    if (this.pickerEnd   && this.endInput)   adjust(this.pickerEnd,   this.endInput);
  }


async openPhotoWithTauri() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Görseller', extensions: ['png','jpg','jpeg','webp','gif'] }]
    });
    if (!selected || Array.isArray(selected)) return;

    const filePath = selected as string;
    const fileName = filePath.split(/[\\/]/).pop()!;
    const bytes = await readFile(filePath);

    const mime = this.guessMimeFromName(fileName) ?? 'application/octet-stream';
    const ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    const blob = new Blob([ab], { type: mime });

    if (!this.acceptImg.includes(blob.type)) {
      await message('Lütfen PNG/JPG/WEBP/GIF formatında bir görsel seçin.', { title: 'Uyarı', kind: 'warning' });
      return;
    }
    if (blob.size > this.maxSizeMB * 1024 * 1024) {
      await message(`Fotoğraf ${this.maxSizeMB} MB üstünde olamaz.`, { title: 'Uyarı', kind: 'warning' });
      return;
    }

    const file = new File([blob], fileName, { type: blob.type });
    this.intern.photoFile = file;

    if (this.photoPreviewUrl) URL.revokeObjectURL(this.photoPreviewUrl);
    this.photoPreviewUrl = URL.createObjectURL(file);
  } catch (err: any) {
    console.error('openPhotoWithTauri error:', err);
    alert(err?.message ?? err);
  }
}


 async openCvWithTauri() {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'CV', extensions: ['pdf','doc','docx'] }]
      });
      if (!selected || Array.isArray(selected)) return;

      const filePath = selected as string;
      const fileName = filePath.split(/[\\/]/).pop()!;
      const bytes = await readFile(filePath);
      const mime = this.guessMimeFromName(fileName) ?? 'application/octet-stream';
      const ab = new ArrayBuffer(bytes.byteLength);
new Uint8Array(ab).set(bytes);
const blob = new Blob([ab], { type: mime });

      if (!this.acceptCv.includes(mime)) {
        await message('Lütfen PDF/DOC/DOCX dosyası seçin.', { title: 'Uyarı', kind: 'warning' });
        return;
      }
      if (blob.size > this.maxSizeMB * 1024 * 1024) {
        await message(`CV ${this.maxSizeMB} MB üstünde olamaz.`, { title: 'Uyarı', kind: 'warning' });
        return;
      }

      this.intern.cvFile = new File([blob], fileName, { type: mime });
    } catch (err:any) {
      console.error('openCvWithTauri error:', err);
      alert(err?.message ?? err);
    }
  }
  private guessMimeFromName(name: string): string | null {
    const n = name.toLowerCase();
    if (n.endsWith('.png'))  return 'image/png';
    if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
    if (n.endsWith('.webp')) return 'image/webp';
    if (n.endsWith('.gif'))  return 'image/gif';
    if (n.endsWith('.pdf'))  return 'application/pdf';
    if (n.endsWith('.doc'))  return 'application/msword';
    if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    return null;
  }
   private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => reader.result ? resolve(reader.result as ArrayBuffer) : reject('File could not be read');
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  
  onFormSubmit(e: Event) {
    e.preventDefault();
    console.log('[FORM] native submit fired');
    this.addIntern();
  }

 
  onSubmitClick() {
    this.addIntern();
  }

  async addIntern() {
    console.log('[FORM] addIntern ENTER', {
      first_name: this.intern.first_name,
      last_name:  this.intern.last_name,
      school:     this.intern.school,
      start_date: this.intern.start_date
    });

    if (!this.intern.first_name || !this.intern.last_name || !this.intern.school || !this.intern.start_date) {
      alert('Lütfen zorunlu alanları doldurun!');
      return;
    }
    if (!this.isInitialized) {
      alert('Database servisi hazır değil! Lütfen uygulamayı yeniden başlatın.');
      return;
    }

    let cvPath: string | null = null;
    let photoPath: string | null = null;

 try {
      if (this.intern.cvFile) {
       
        const cvContent = await this.readFileAsArrayBuffer(this.intern.cvFile);
        const cvBytes = new Uint8Array(cvContent);
        const cvSavePath = `C:/intern_files/cv_${Date.now()}_${this.intern.cvFile.name}`;
        await this.dbService.saveFile(cvSavePath, Array.from(cvBytes));
        cvPath = cvSavePath;
      }

      if (this.intern.photoFile) {
        const photoContent = await this.readFileAsArrayBuffer(this.intern.photoFile);
        const photoBytes = new Uint8Array(photoContent);
        const photoSavePath = `C:/intern_files/photo_${Date.now()}_${this.intern.photoFile.name}`;
        await this.dbService.saveFile(photoSavePath, Array.from(photoBytes));
        photoPath = photoSavePath;
      }

      
      const payload: Omit<Intern, 'id'> & { id?: number } = {
        first_name: this.intern.first_name,
        last_name:  this.intern.last_name,
        school:     this.intern.school,
        department: this.intern.department,
        start_date: this.intern.start_date ? formatDate(this.intern.start_date, 'yyyy-MM-dd', 'en-US') : '',
        end_date:   this.intern.end_date   ? formatDate(this.intern.end_date,   'yyyy-MM-dd', 'en-US') : undefined,
        status:     this.intern.status,
        contact:    this.intern.contact,
        email:      this.intern.email,
        cv_path:    cvPath ?? undefined,
        photo_path: photoPath ?? undefined
      };

      console.log('[FORM] add_intern payload =', payload);
      const newId = await this.dbService.addIntern(payload as Intern);
      console.log('[FORM] new id =', newId);

      const [path, count] = await this.dbService.debugSnapshot();
      console.log('[FORM] add sonrası snapshot:', path, 'count:', count);

      alert('Stajyer başarıyla eklendi!');
      await this.router.navigate(['/dashboard/intern-list']);
      setTimeout(() => window.dispatchEvent(new Event('force-refresh')), 50);
    } catch (err: any) {
      console.error('Stajyer ekleme hatası:', err);
      alert('Stajyer eklenirken hata oluştu: ' + (err?.message ?? err));
    }
  }

clearPhoto() {
  if (this.photoPreviewUrl) {
    URL.revokeObjectURL(this.photoPreviewUrl);
  }
  this.photoPreviewUrl = null;
  this.intern.photoFile = null;
}

clearCv() {
  this.intern.cvFile = null;
}

get selectedCvLabel(): string {
  if (!this.intern.cvFile) return '';
  const name = this.intern.cvFile.name;
  const sizeKB = Math.max(1, Math.round(this.intern.cvFile.size / 1024));
  return `${name} • ${sizeKB} KB`;
}


  ngOnDestroy() {
    if (this.photoPreviewUrl) URL.revokeObjectURL(this.photoPreviewUrl);
  }
}