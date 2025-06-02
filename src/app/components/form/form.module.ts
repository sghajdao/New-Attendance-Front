import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormRoutingModule } from './form-routing.module';
import { FormComponent } from './form.component';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from "primeng/floatlabel"
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { NavbarComponent } from './navbar/navbar.component';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { BarChartComponent } from './bar-chart/bar-chart.component';
import { ChartModule } from 'primeng/chart';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableComponent } from './table/table.component';
import { TableModule } from 'primeng/table';
import { GeneralDetailsComponent } from './general-details/general-details.component';
import { QuickStartComponent } from './quick-start/quick-start.component';



@NgModule({
  declarations: [
    FormComponent,
    NavbarComponent,
    BarChartComponent,
    TableComponent,
    GeneralDetailsComponent,
    QuickStartComponent
  ],
  imports: [
    CommonModule,
    FormRoutingModule,
    RouterModule,
    CardModule,
    FloatLabelModule, InputTextModule, FormsModule,
    BadgeModule,
    ButtonModule,
    SelectModule,
    DatePickerModule,
    TagModule,
    ChartModule,
    SliderModule,
    SelectButtonModule,
    ReactiveFormsModule,
    TableModule,
]
})
export class FormModule { }
