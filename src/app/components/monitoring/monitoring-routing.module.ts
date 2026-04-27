import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MonitoringComponent } from './monitoring.component';
import { trackGuard } from '../../guards/track.guard';

const routes: Routes = [
  {
    path: '',
    component: MonitoringComponent,
    canActivate: [trackGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MonitoringRoutingModule { }
