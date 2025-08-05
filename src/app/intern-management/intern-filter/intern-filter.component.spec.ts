import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InternFilterComponent } from './intern-filter.component';

describe('InternFilterComponent', () => {
  let component: InternFilterComponent;
  let fixture: ComponentFixture<InternFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternFilterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(InternFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
