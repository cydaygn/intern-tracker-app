import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InternFormComponent } from '../intern-form/intern-form.component';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('InternFormComponent', () => {
  let component: InternFormComponent;
  let fixture: ComponentFixture<InternFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [InternFormComponent],
      imports: [
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        NoopAnimationsModule
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InternFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
