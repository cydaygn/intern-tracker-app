import { Component, EventEmitter, Output, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() menuToggle = new EventEmitter<void>();

  private win = getCurrentWindow();
  isMaximized = false;
  private unlistenFns: Array<() => void> = [];
  currentLang: 'tr' | 'en' = (localStorage.getItem('lang') as 'tr' | 'en') || 'tr';

  constructor(private translate: TranslateService) {}

  async ngOnInit() {
    // başlangıç durumu
    try { this.isMaximized = await this.win.isMaximized(); } catch {}

    // (opsiyonel) durum senkronu: maximize/unmaximize olaylarını dinle
    try {
      const un1 = await this.win.listen('tauri://resize', async () => {
        this.isMaximized = await this.win.isMaximized();
      });
      const un2 = await this.win.listen('tauri://unmaximize', () => { this.isMaximized = false; });
      const un3 = await this.win.listen('tauri://maximize', () => { this.isMaximized = true; });
      this.unlistenFns.push(un1, un2, un3);
    } catch {}
  }

  ngOnDestroy() {
    // dinleyicileri temizle
    for (const un of this.unlistenFns) {
      try { un(); } catch {}
    }
  }

  minimize() {
    this.win.minimize();
  }

  async toggleMaximize() {
    // v2'de doğrudan toggle var
    await this.win.toggleMaximize();
    // ikon anında güncellensin
    this.isMaximized = await this.win.isMaximized();
  }

  close() {
    this.win.close();
  }

  switchLanguage(lang: 'tr' | 'en') {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.lang = lang;
  }
}
