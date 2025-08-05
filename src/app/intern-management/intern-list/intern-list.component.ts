import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Stajyer } from '../../models/stajyer.model';
interface Intern {
  ad: string;
  soyad: string;
  okul: string;
  bolum: string;
  baslangicTarihi: string;
  bitisTarihi?: string;
  durum: string;
  eposta: string;
  iletisim: string;
}

interface SavedView {
  name: string;
  filters: Filters;
}

interface Filters {
  name: string;
  school: string;
  period: string;
  projectStatus: string;
  tag: string;
}

@Component({
  selector: 'app-intern-list',
  templateUrl: './intern-list.component.html',
  styleUrls: ['./intern-list.component.scss'],
})
export class InternListComponent implements OnInit {
  interns: Intern[] = [];
  filteredInterns: Intern[] = [];
  tauriAPI: any;

  filters: Filters = {
    name: '',
    school: '',
    period: '',
    projectStatus: '',
    tag: '',
  };

  savedViews: SavedView[] = [];

  constructor(private router: Router) {}

  async ngOnInit(): Promise<void> {
    this.loadSavedViews();
    await this.initializeTauri();
    await this.loadInternsFromBackend();
    await this.listenForNewInterns(); 
  }

  private async initializeTauri() {
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');
    this.tauriAPI = { invoke, listen };
  }


  private async listenForNewInterns() {
    if (!this.tauriAPI?.listen) return;
    await this.tauriAPI.listen('stajyer_eklendi', async (event: any) => {
      console.log(' Yeni stajyer eklendi:', event.payload);
      await this.loadInternsFromBackend();
    });
  }

 
  async loadInternsFromBackend() {
    try {
      const result: any = await this.tauriAPI.invoke('get_stajyerler');
      if (result.success && result.data) {
        this.interns = result.data;
        this.filteredInterns = [...this.interns];
        console.log(' Stajyer listesi alındı:', this.interns);
      } else {
        console.warn(' Liste boş geldi.');
      }
    } catch (err) {
      console.error(' Stajyer listesi alınamadı:', err);
    }
  }

 
  applyFilters() {
    this.filteredInterns = this.interns.filter((intern) => {
      return (
        `${intern.ad} ${intern.soyad}`
          .toLowerCase()
          .includes(this.filters.name.toLowerCase()) &&
        intern.okul
          .toLowerCase()
          .includes(this.filters.school.toLowerCase()) &&
        (this.filters.period
          ? intern.baslangicTarihi.includes(this.filters.period)
          : true) &&
        (this.filters.projectStatus
          ? intern.durum === this.filters.projectStatus
          : true)
      );
    });
  }
async getStajyerler(): Promise<Stajyer[]> {
  const result = await this.tauriAPI.invoke('get_stajyerler');
  return (result as { data: Stajyer[] }).data;  
}
 
  saveView() {
    const viewName = prompt('Görünüme bir isim veriniz:');
    if (viewName) {
      this.savedViews.push({
        name: viewName,
        filters: { ...this.filters },
      });
      this.saveViewsToStorage();
    }
  }


  loadView(view: SavedView) {
    this.filters = { ...view.filters };
    this.applyFilters();
  }

  deleteView(view: SavedView) {
    this.savedViews = this.savedViews.filter((v) => v !== view);
    this.saveViewsToStorage();
  }

  saveViewsToStorage() {
    localStorage.setItem('savedInternViews', JSON.stringify(this.savedViews));
  }

  loadSavedViews() {
    const stored = localStorage.getItem('savedInternViews');
    if (stored) {
      this.savedViews = JSON.parse(stored);
    }
  }
}
