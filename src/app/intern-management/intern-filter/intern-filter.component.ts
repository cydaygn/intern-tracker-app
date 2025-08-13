import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-intern-filter',
  templateUrl: './intern-filter.component.html',
  styleUrls: ['./intern-filter.component.scss'],
})
export class InternFilterComponent {
  nameFilter: string = '';
  schoolFilter: string = '';
  periodFilter: string = '';
  projectStatusFilter: string = '';
  tagFilter: string = '';

  periods: string[] = ['2023 Bahar', '2023 Yaz', '2023 Güz']; // Örnek dönemler
  projectStatuses: string[] = ['Planned', 'In Progress', 'Completed']; // Örnek proje durumları
  tags: string[] = ['Frontend', 'Backend', 'Fullstack']; // Örnek etiketler

  @Output() filterChanged = new EventEmitter<{
    name: string;
    school: string;
    period: string;
    projectStatus: string;
    tag: string;
  }>();

  onFilterChange() {
    this.filterChanged.emit({
      name: this.nameFilter,
      school: this.schoolFilter,
      period: this.periodFilter,
      projectStatus: this.projectStatusFilter,
      tag: this.tagFilter,
    });
  }

  clearFilters() {
    this.nameFilter = '';
    this.schoolFilter = '';
    this.periodFilter = '';
    this.projectStatusFilter = '';
    this.tagFilter = '';
    this.onFilterChange();
  }
}
