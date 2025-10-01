Tauri + Angular
Kurumsal staj süreçlerini tek bir masaüstü uygulamasında yönetmek için geliştirilmiş, Angular 17 + Tauri v2 (Rust) mimarisine sahip, offline/yerel SQLite (SQLCipher) veritabanı kullanan çapraz platform (Windows/macOS/Linux) bir uygulama.

. Stajyer kayıtları (kişisel bilgiler, okul, dönem, başlangıç/bitiş)

. CV/Fotoğraf yükleme ve indirme

. Proje/görev atama, durum takibi (Planned/In Progress/Completed)

. Not & değerlendirme, 0–100 puanlı rubrik, dönemlik performans grafiği

. Hızlı arama/filtreleme, kaydedilmiş görünümler (örn. “2025 Yaz Dönemi”)

. Otomatik yedekleme (JSON/SQL → ZIP), disk kotası yöneti mi

. Son tarih bildirimi ve “not girilmemiş stajyer” hatırlatıcısı

UI: Angular 17, Angular Material, RxJS

Desktop: Tauri v2, Rust 1.78+

DB: embedded SQLite (SQLCipher)

State: NGXS/Akita (tercih)

Chart/Rapor: Chart.js, pdfmake

Gereksinimler
Node.js LTS (≥ 20) ve npm

Rust (stable) ve cargo (rustup ile)

Visual Studio Build Tools 2022 (C++ derleme bileşenleri)

WebView2 Runtime (Edge ile gelir)

Kurulum
Depoyu klonla git clone cd intern-tracker-application

UI bağımlılıkları npm install

Rust toolchain (yüklü değilse) curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh rustup update

Tauri + Angular geliştirme modu
npm run tauri dev

Build & Paketleme
npm run build

npm run tauri build
[VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) + [Angular Language Service](https://marketplace.visualstudio.com/items?itemName=Angular.ng-template).
