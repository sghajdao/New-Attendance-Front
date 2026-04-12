import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MonitoringRoutingModule } from './monitoring-routing.module';
import { NavbarComponent } from './navbar/navbar.component';
import { ToastModule } from 'primeng/toast';
import { FiltersComponent } from './filters/filters.component';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { MonitoringComponent } from './monitoring.component';
import { MessageService } from 'primeng/api';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { DeatailsTableComponent } from './deatails-table/deatails-table.component';
import { AbsenceThresholdComponent } from './absence-threshold/absence-threshold.component';
import { MeetingHistoryComponent } from './meeting-history/meeting-history.component';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { MeterGroupModule } from 'primeng/metergroup';
import { DialogModule } from 'primeng/dialog';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';


@NgModule({
  declarations: [
    NavbarComponent,
    FiltersComponent,
    MonitoringComponent,
    DeatailsTableComponent,
    AbsenceThresholdComponent,
    MeetingHistoryComponent,
  ],
  imports: [
    CommonModule,
    MonitoringRoutingModule,
    ToastModule,
    CardModule,
    IconFieldModule,
    InputIconModule,
    MultiSelectModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    TagModule,
    BadgeModule,
    OverlayBadgeModule,
    MeterGroupModule,
    DialogModule,
    InputTextModule,
    DatePickerModule,
    SelectModule,
    TextareaModule,
    ProgressSpinnerModule,
    ProgressBarModule,
  ],
  providers: [MessageService]
})
export class MonitoringModule { }
