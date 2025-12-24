import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogoutModalComponent } from './logout-modal/logout-modal.component';
import { DialogModule } from 'primeng/dialog';



@NgModule({
  declarations: [
    LogoutModalComponent
  ],
  imports: [
    CommonModule,
    DialogModule
  ]
})
export class ModalsModule { }
