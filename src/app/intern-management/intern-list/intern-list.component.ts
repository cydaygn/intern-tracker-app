import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../../shared/dialog/dialog.component';
import { DatabaseService } from '../../services/database.service';
import { Intern } from '../../models/intern.model';

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
export class InternListComponent implements OnInit, OnDestroy {
  interns: Intern[] = [];
  filteredInterns: Intern[] = [];
  isLoading = false;

  filters: Filters = {
    name: '',
    school: '',
    period: '',
    projectStatus: '',
    tag: '',
  };

  savedViews: SavedView[] = [];

  private refreshHandler = () => this.refreshList();

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private dbService: DatabaseService,
    private zone: NgZone
  ) {}
goToUpdate() {
  this.router.navigate(['/dashboard/intern-form'], { queryParams: { update: 1 } });
}
  async ngOnInit(): Promise<void> {
    window.addEventListener('force-refresh', this.refreshHandler);
    this.loadSavedViews();
    await this.loadInternsFromDatabase();
  }

  ngOnDestroy(): void {
    window.removeEventListener('force-refresh', this.refreshHandler);
  }
 capitalizeFirst(str: string) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
 
applyFilters() {
  const nameFilter   = (this.filters.name ?? '').trim().toLowerCase();
  const schoolFilter = (this.filters.school ?? '').trim().toLowerCase();
  const periodFilter = (this.filters.period ?? '').trim();
  const statusFilter = (this.filters.projectStatus ?? '').trim();
  const tagFilter    = (this.filters.tag ?? '').trim();

  this.filteredInterns = this.interns.filter((intern) => {
    const fullName = `${intern.first_name ?? ''} ${intern.last_name ?? ''}`.toLowerCase();
    const school   = (intern.school ?? '').toLowerCase();
    const start    = (intern.start_date ?? ''); 
    const status   = (intern.status ?? '').toLowerCase();
   
    let okPeriod = true;
    if (periodFilter && start) {
      const [year, monthStr] = start.split("-");
      const month = parseInt(monthStr, 10);
      let season = '';
      if ([6, 7, 8].includes(month)) season = 'Yaz';
      else if ([3, 4, 5].includes(month)) season = 'Bahar';
      else if ([9, 10, 11].includes(month)) season = 'Güz';
      else season = 'Kış';
      okPeriod = `${year}-${season}` === periodFilter;
    }

    return (
      fullName.includes(nameFilter) &&
      school.includes(schoolFilter) &&
      okPeriod &&
      (statusFilter ? status === statusFilter : true) 
      );
  }).map((intern) => ({
    ...intern,
    status: (intern.status ?? '').toUpperCase()
  }));
}
onFiltersChanged(newFilters: Filters) {
  this.filters = newFilters;
  this.applyFilters();
}

async deleteIntern(intern: Intern) {
  const ref = this.openDialog(
    'Silme Onayı',
    `"${intern.first_name} ${intern.last_name}" kaydını silmek istediğinize emin misiniz?`,
    'confirm'
  );

  ref.afterClosed().subscribe(async (onay) => {
    if (!onay || !intern.id) return;

    try {
      this.isLoading = true;
      await this.dbService.deleteIntern(intern.id);
    
      this.openDialog('Bilgi', 'Stajyer başarıyla silindi.', 'info');
   
      await this.loadInternsFromDatabase();
    } catch (e: any) {
      console.error('Silme hatası:', e);
      this.openDialog('Hata', 'Stajyer silinemedi: ' + (e?.message ?? e), 'error');
    } finally {
      this.isLoading = false;
    }
  });
}
async loadInternsFromDatabase() {
  this.isLoading = true;
  try {
    await this.dbService.ensureInitialized();

    let path = '';
    let count = -1;
    try {
      [path, count] = await this.dbService.debugSnapshot();
    } catch {}
    if (count >= 0) console.log('[DB] path:', path, 'count:', count);

    const result: Intern[] = await this.dbService.getInterns();

    this.zone.run(() => {
      this.interns = result ?? [];
      this.filteredInterns = [...this.interns];
      this.populateAvailablePeriods(); 
      this.applyFilters();
    });

    console.log('Stajyerler yüklendi:', this.interns.length);
  } catch (err) {
    console.error('Stajyerleri yükleme hatası:', err);
    this.openDialog(
      'Error',
      'Failed to load intern list: ' + (err as any).message,
      'error'
    );
  } finally {
    this.isLoading = false;
  }
}


populateAvailablePeriods() {
  const periods = new Set<string>();

  this.interns.forEach(intern => {
    if (!intern.start_date) return;

    const [year, monthStr] = intern.start_date.split("-");
    const month = parseInt(monthStr, 10);

    let season = '';
    if ([6, 7, 8].includes(month)) season = 'Yaz';
    else if ([3, 4, 5].includes(month)) season = 'Bahar';
    else if ([9, 10, 11].includes(month)) season = 'Güz';
    else season = 'Kış';

    periods.add(`${year}-${season}`);
  });

 
  this.availablePeriods = Array.from(periods).map(val => ({
    value: val,
    label: val.replace('-', ' ')
  }));
}

availablePeriods: { value: string, label: string }[] = [];

  async saveView() {
    const viewName = 'Kaydedilen Görünüm ' + (this.savedViews.length + 1);
    this.savedViews.push({ name: viewName, filters: { ...this.filters } });
    this.saveViewsToStorage();
    this.openDialog('View Saved', `View "${viewName}" saved successfully.`, 'info');
  }
  loadView(view: SavedView) {
    this.filters = { ...view.filters };
    this.applyFilters();
  }
  deleteView(view: SavedView) {
    const dialogRef = this.openDialog(
      'Silmeyi Onayla',
      `Görünümünü silmek istediğinizden emin misiniz? "${view.name}"?`,
      'confirm'
    );
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.savedViews = this.savedViews.filter((v) => v !== view);
        this.saveViewsToStorage();
        this.openDialog('Deleted', 'The view has been deleted.', 'info');
      }
    });
  }
  saveViewsToStorage() {
    try {
      localStorage.setItem('savedInternViews', JSON.stringify(this.savedViews));
    } catch (e) {
      console.error('Failed to save views to localStorage', e);
    }
  }
  loadSavedViews() {
    try {
      const stored = localStorage.getItem('savedInternViews');
      if (stored) this.savedViews = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to load saved views from localStorage', e);
    }
  }

 
  openDialog(title: string, message: string, type: 'info' | 'error' | 'confirm') {
    return this.dialog.open(DialogComponent, {
      width: '400px',
      data: { title, message, type },
    });
  }

  
  async refreshList() {
    await this.loadInternsFromDatabase();
  }
}