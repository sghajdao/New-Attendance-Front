import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WithdrawRoutingModule } from './withdraw-routing.module';
import { WithdrawComponent } from './withdraw.component';
import { NavbarComponent } from './navbar/navbar.component';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';


@NgModule({
  declarations: [
    WithdrawComponent,
    NavbarComponent
  ],
  imports: [
    CommonModule,
    WithdrawRoutingModule,
    ButtonModule,
    CardModule,
    TagModule
  ]
})
export class WithdrawModule { }
