import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternFormComponent } from './intern-form.component';

describe('InternFormComponent', () => {
  let component: InternFormComponent;
  let fixture: ComponentFixture<InternFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InternFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
