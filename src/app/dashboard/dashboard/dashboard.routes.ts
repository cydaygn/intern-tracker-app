
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard.component';

import { InternListComponent } from '../../intern-management/intern-list/intern-list.component';
import { InternFormComponent } from '../../intern-management/intern-form/intern-form.component';
import { EvaluationsListComponent } from '../../intern-management/evaluations-list/evaluations-list.component';

import { AssignProjectComponent } from '../../intern-management/assign-project/assign-project.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      { path: 'intern-list', component: InternListComponent },
      { path: 'intern-form', component: InternFormComponent },
       { path: 'assign-project', component: AssignProjectComponent },
        { path: 'evaluation-list', component: EvaluationsListComponent },

      ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
