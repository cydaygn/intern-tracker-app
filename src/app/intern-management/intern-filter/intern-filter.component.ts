import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-intern-filter',
  template: `
    <div class="filter-container">
      <input type="text" placeholder="İsim ile ara..." [(ngModel)]="nameFilter" (input)="onFilterChange()" />
      <input type="text" placeholder="Okul ile ara..." [(ngModel)]="schoolFilter" (input)="onFilterChange()" />
    </div>
  `,
  styles: [`
    .filter-container {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    input {
      flex: 1;
      padding: 0.5rem;
      font-size: 1rem;
    }
  `]
})
export class InternFilterComponent {
  nameFilter: string = '';
  schoolFilter: string = '';

  @Output() filterChanged = new EventEmitter<{ name: string; school: string }>();

  onFilterChange() {
    this.filterChanged.emit({
      name: this.nameFilter,
      school: this.schoolFilter
    });
  }
}
