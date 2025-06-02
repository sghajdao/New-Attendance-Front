import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { NavbarComponent } from './navbar/navbar.component';
import { FilteringDetailsComponent } from './filtering-details/filtering-details.component';
import { QuickOverviewComponent } from './quick-overview/quick-overview.component';


@NgModule({
  declarations: [
    HomeComponent,
    NavbarComponent,
    FilteringDetailsComponent,
    QuickOverviewComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    CardModule,
    ButtonModule,
    MenubarModule,
  ]
})
export class HomeModule { }
