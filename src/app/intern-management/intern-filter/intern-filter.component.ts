import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-intern-filter',
  templateUrl: './intern-filter.component.html',
  styleUrls: ['./intern-filter.component.scss'],
})
export class InternFilterComponent {
  @Input() periods: { value: string; label: string }[] = [];

  nameFilter: string = '';
  schoolFilter: string = '';
  periodFilter: string = '';
  projectStatusFilter: string = '';
  tagFilter: string = '';

  projectStatuses: string[] = ['Aktif', 'Tamamlandı', 'Beklemede'];
  tags: string[] = ['Frontend', 'Backend', 'Fullstack'];

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
