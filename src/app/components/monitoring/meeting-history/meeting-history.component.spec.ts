import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingHistoryComponent } from './meeting-history.component';

describe('MeetingHistoryComponent', () => {
  let component: MeetingHistoryComponent;
  let fixture: ComponentFixture<MeetingHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeetingHistoryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeetingHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
