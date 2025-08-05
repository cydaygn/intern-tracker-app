import {
  Component,
  EventEmitter,
  Output,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDatepicker } from '@angular/material/datepicker';
import { formatDate } from '@angular/common';
@Component({
  selector: 'app-intern-form',
  templateUrl: './intern-form.component.html',
  styleUrls: ['./intern-form.component.scss'],
})
export class InternFormComponent implements OnInit, AfterViewInit, OnDestroy {
  @Output() cancel = new EventEmitter<void>();
  @Output() formSubmit = new EventEmitter<any>();

  private tauriAPI: any = null;
  private isInitialized = false;

  yeniStajyer = {
    ad: '',
    soyad: '',
    okul: '',
    bolum: '',
    baslangicTarihi: null,
    bitisTarihi: null,
    durum: 'aktif',
    iletisim: '',
    eposta: '',
    cvDosyasi: null as File | null,
    fotografDosyasi: null as File | null,
  };

  @ViewChild('pickerBaslangic') pickerBaslangic!: MatDatepicker<Date>;
  @ViewChild('pickerBitis') pickerBitis!: MatDatepicker<Date>;
  @ViewChild('baslangicInput', { read: ElementRef })
  baslangicInput!: ElementRef<HTMLInputElement>;
  @ViewChild('bitisInput', { read: ElementRef })
  bitisInput!: ElementRef<HTMLInputElement>;
 @ViewChild('fotoInput') fotoInput!: ElementRef<HTMLInputElement>;
  @ViewChild('cvInput') cvInput!: ElementRef<HTMLInputElement>;

  constructor(private router: Router) {}

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  async ngOnInit() {
    
    if (!(window as any).__TAURI__) {
      console.error(' Tauri ortamı bulunamadı!');
      this.isInitialized = false;
      return;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      this.tauriAPI = { invoke };
      this.isInitialized = true;
      console.log(' Tauri API hazır!');
    } catch (err) {
      console.error(' Tauri API yüklenemedi:', err);
      this.isInitialized = false;
    }
  }
 fotoButtonClick() {
    this.fotoInput.nativeElement.click();
  }

  cvButtonClick() {
    this.cvInput.nativeElement.click();
  }
  ngAfterViewInit() {
    if (this.pickerBaslangic && this.baslangicInput) {
      this.adjustDatepickerPosition(this.pickerBaslangic, this.baslangicInput);
    }
    if (this.pickerBitis && this.bitisInput) {
      this.adjustDatepickerPosition(this.pickerBitis, this.bitisInput);
    }
  }
onPhotoSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.yeniStajyer.fotografDosyasi = input.files[0];
    console.log(' Fotoğraf seçildi:', this.yeniStajyer.fotografDosyasi.name);
  }
}

onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.yeniStajyer.cvDosyasi = input.files[0];
    console.log(' CV dosyası seçildi:', this.yeniStajyer.cvDosyasi.name);
  }
}

  private adjustDatepickerPosition(
    picker: MatDatepicker<Date>,
    inputRef: ElementRef<HTMLInputElement>
  ) {
    picker.openedStream.subscribe(() => {
      setTimeout(() => {
        const overlay = document.querySelector(
          '.custom-datepicker .mat-datepicker-content'
        ) as HTMLElement;
        if (!overlay) return;

        const rect = inputRef.nativeElement.getBoundingClientRect();

        overlay.style.position = 'fixed';
        overlay.style.top = `${rect.bottom + window.scrollY + 4}px`;
        overlay.style.left = `${rect.left + window.scrollX}px`;
        overlay.style.zIndex = '2100';
        overlay.style.width = `${rect.width}px`;
      }, 0);
    });
  }

  async ekle() {
    if (
      !this.yeniStajyer.ad ||
      !this.yeniStajyer.soyad ||
      !this.yeniStajyer.okul ||
      !this.yeniStajyer.baslangicTarihi
    ) {
      alert(' Lütfen zorunlu alanları doldurun!');
      return;
    }

    if (!this.isInitialized) {
      alert('Tauri API hazır değil! Lütfen uygulamayı Tauri ile başlatın.');
      return;
    }

    const stajyerVerisi = {
      ad: this.yeniStajyer.ad,
      soyad: this.yeniStajyer.soyad,
      okul: this.yeniStajyer.okul,
      bolum: this.yeniStajyer.bolum,
     baslangicTarihi: this.yeniStajyer.baslangicTarihi
        ? formatDate(this.yeniStajyer.baslangicTarihi, 'dd.MM.yyyy', 'en-US')
        : '',
      bitisTarihi: this.yeniStajyer.bitisTarihi
        ? formatDate(this.yeniStajyer.bitisTarihi, 'dd.MM.yyyy', 'en-US')
        : '',
      durum: this.yeniStajyer.durum,
      iletisim: this.yeniStajyer.iletisim,
      eposta: this.yeniStajyer.eposta,
    };

    try {
      const result = await this.tauriAPI.invoke('stajyer_ekle', { stajyer: stajyerVerisi });
      console.log(' Rust yanıtı:', result);
      alert(' Stajyer başarıyla eklendi!');
      this.router.navigate(['/dashboard/intern-list']);
    } catch (err) {
      console.error(' Veri gönderim hatası:', err);
      alert('Rust tarafına veri gönderilemedi!');
    }
  }

  ngOnDestroy() {}
  
}