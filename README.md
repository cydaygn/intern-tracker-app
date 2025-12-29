# Intern Tracker App

Kurumsal staj süreçlerini tek bir masaüstü uygulamasında yönetmek için geliştirilmiş, Angular 17 + Tauri v2 (Rust) mimarisine sahip, offline/yerel SQLite (SQLCipher) veritabanı kullanan çapraz platform (Windows/macOS/Linux) bir uygulama.
## Özellikler

### Stajyer Yönetimi
- Stajyer kayıtları (kişisel bilgiler, okul, dönem, başlangıç/bitiş)
- CV / fotoğraf yükleme ve indirme

### Görev & Performans
- Proje / görev atama
- Durum takibi (Planned / In Progress / Completed)
- Not & değerlendirme (0–100 rubrik)
- Dönemlik performans grafikleri

### Verimlilik
- Hızlı arama ve filtreleme
- Kaydedilmiş görünümler (örn. “2025 Yaz Dönemi”)

### Sistem & Güvenlik
- Offline çalışma
- SQLCipher ile şifreli yerel veritabanı
- Otomatik yedekleme (JSON / SQL → ZIP)
- Disk kotası yönetimi
- Son tarih bildirimleri
- “Not girilmemiş stajyer” hatırlatıcıları

## Mimari & Tasarım Kararları

- **Angular 17**: Büyük veri formları ve state yönetimi için
- **Tauri v2 (Rust)**: Electron’a göre daha düşük bellek kullanımı
- **SQLite + SQLCipher**: Offline kullanım ve veri güvenliği
- **RxJS + State Management**: Reaktif ve ölçeklenebilir UI
- **Chart.js / pdfmake**: Raporlama ve çıktı alma


#### Anasayfa 
<img width="500" height="742" alt="image" src="https://github.com/user-attachments/assets/4b7a408a-3096-4eb3-a444-24035b6d267e" />

#### Değerlendirme 
<img width="500" height="1006" alt="image" src="https://github.com/user-attachments/assets/3ac1ea93-c302-44a3-9586-1744b8e24d52" />


## Kurulum

### Gereksinimler
- Node.js LTS (≥ 20)
- Rust (stable) & Cargo
- Visual Studio Build Tools 2022 (Windows)
- WebView2 Runtime

### Kurulum Adımları
```bash
git clone https://github.com/cydaygn/intern-tracker-app.git
cd intern-tracker-app
npm install
````

#### Geliştirme Modu
 npm run tauri dev

#### Build-Üretim
npm run build

npm run tauri build

[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template).
