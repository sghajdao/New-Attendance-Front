import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WithdrawRoutingModule } from './withdraw-routing.module';
import { WithdrawComponent } from './withdraw.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TeacherListComponent } from './teacher-list/teacher-list.component';
import { AdminListComponent } from './admin-list/admin-list.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';


@NgModule({
  declarations: [
    WithdrawComponent,
    NavbarComponent,
    TeacherListComponent,
    AdminListComponent
  ],
  imports: [
    CommonModule,
    WithdrawRoutingModule,
    ButtonModule,
    CardModule,
    TagModule,
    ToastModule,
    DialogModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    AutoCompleteModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  providers: [
    MessageService, ConfirmationService
  ]
})
export class WithdrawModule { }
