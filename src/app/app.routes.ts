import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';


import { InternListComponent } from './intern-management/intern-list/intern-list.component';
import { InternFormComponent } from './intern-management/intern-form/intern-form.component';
import { AssignProjectComponent } from './intern-management/assign-project/assign-project.component';
import { MainPageComponent } from './main-page/main-page.component';
import { EvaluationsListComponent } from './intern-management/evaluations-list/evaluations-list.component';
import { EvaluationDetailComponent } from './intern-management/evaluation-detail/evaluation-detail.component';

export const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
       { path: '', component: MainPageComponent },
      { path: 'intern-list', component: InternListComponent },
      { path: 'intern-form', component: InternFormComponent },
 { path: 'evaluations', component: EvaluationsListComponent },

      
      { path: 'evaluations/:id', component: EvaluationDetailComponent },

      { path: 'assign-project', component: AssignProjectComponent },
    ]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
