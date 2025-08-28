import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { EvaluationsListComponent } from './evaluations-list/evaluations-list.component';
import { EvaluationDetailComponent } from './evaluation-detail/evaluation-detail.component';

import { MatTableModule } from '@angular/material/table';

import { InternFilterComponent } from './intern-filter/intern-filter.component';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { InternListComponent } from './intern-list/intern-list.component';
import { InternFormComponent } from './intern-form/intern-form.component';
import { AssignProjectComponent } from './assign-project/assign-project.component';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
@NgModule({
  declarations: [
   EvaluationsListComponent,
    InternListComponent,
    InternFormComponent,
    AssignProjectComponent,
      EvaluationDetailComponent,
      
    InternFilterComponent
  ],
  imports: [
  
    MatTableModule,
    CommonModule,
    FormsModule,
      MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,   
      MatSelectModule,
    TranslateModule,
  ],
  exports: [
    InternFormComponent 
  ]
})
export class InternManagementModule {}
