import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DsaRoutingModule } from './dsa-routing.module';
import { DsaComponent } from './dsa.component';
import { DetailsTableComponent } from './details-table/details-table.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { EditorModule } from 'primeng/editor';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MeterGroupModule } from 'primeng/metergroup';
import { MultiSelectModule } from 'primeng/multiselect';
import { OverlayBadgeModule } from 'primeng/overlaybadge';
import { PaginatorModule } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { FiltersComponent } from './filters/filters.component';


@NgModule({
  declarations: [
    DsaComponent,
    DetailsTableComponent,
    FiltersComponent
  ],
  imports: [
    CommonModule,
    DsaRoutingModule,
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
    DropdownModule,
    PaginatorModule,
    CheckboxModule,
    ChartModule,
    EditorModule,
    ConfirmDialogModule,
  ]
})
export class DsaModule { }
