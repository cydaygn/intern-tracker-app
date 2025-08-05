import { Component } from '@angular/core';
import { Router } from '@angular/router';
interface Stajyer {
  id: number;
  ad: string;
}

@Component({
  selector: 'app-evaluations-list',
  templateUrl: './evaluations-list.component.html',
  styleUrls: ['./evaluations-list.component.scss']
})
export class EvaluationsListComponent {
  stajyerler = [
 { id: 1, ad: 'Ahmet Yılmaz' },
    { id: 2, ad: 'Ayşe Demir' },
  ];

  constructor(private router: Router) {}

  detayGoster(id: number) {
    this.router.navigate(['/dashboard/evaluations', id]);
  }
}
