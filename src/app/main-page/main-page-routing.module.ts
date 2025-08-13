import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MainPageComponent } from './main-page.component';

const routes: Routes = [
  {
    path: '',
    component: MainPageComponent,
    children: [
      {
        path: 'intern-list',
        loadComponent: () =>
          import('../intern-management/intern-list/intern-list.component').then(
            (m) => m.InternListComponent
          ),
      },
      {
        path: 'intern-form',
        loadComponent: () =>
          import('../intern-management/intern-form/intern-form.component').then(
            (m) => m.InternFormComponent
          ),
      },
      {
        path: 'assign-project',
        loadComponent: () =>
          import('../intern-management/assign-project/assign-project.component').then(
            (m) => m.AssignProjectComponent
          ),
      },
      {
        path: 'evaluation-list',
        loadComponent: () =>
          import('../intern-management/evaluations-list/evaluations-list.component').then(
            (m) => m.EvaluationsListComponent
          ),
      },
      {
        path: '',
        redirectTo: 'intern-list',
        pathMatch: 'full',
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MainPageRoutingModule {}
