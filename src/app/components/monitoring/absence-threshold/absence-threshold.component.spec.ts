import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AbsenceThresholdComponent } from './absence-threshold.component';

describe('AbsenceThresholdComponent', () => {
  let component: AbsenceThresholdComponent;
  let fixture: ComponentFixture<AbsenceThresholdComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AbsenceThresholdComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AbsenceThresholdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
