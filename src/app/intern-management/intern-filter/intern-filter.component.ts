import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

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

  // Use stable keys; UI renders translated labels
  projectStatuses: string[] = ['active', 'completed', 'pending'];
  tags: string[] = ['frontend', 'backend', 'fullstack'];

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

  constructor(private translate: TranslateService) {}

  getStatusLabel(key: string): string {
    return this.translate.instant('filters.statuses.' + key);
  }

  getTagLabel(key: string): string {
    return this.translate.instant('filters.tags.' + key);
  }

  getPeriodLabel(value: string): string {
    // value format expected: YYYY-SEASONKEY
    if (!value) return '';
    const [year, seasonKey] = value.split('-');
    const season = this.translate.instant('filters.seasons.' + seasonKey);
    return `${year} ${season}`;
  }
}
