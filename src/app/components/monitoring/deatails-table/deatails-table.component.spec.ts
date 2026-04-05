import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeatailsTableComponent } from './deatails-table.component';

describe('DeatailsTableComponent', () => {
  let component: DeatailsTableComponent;
  let fixture: ComponentFixture<DeatailsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeatailsTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeatailsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
