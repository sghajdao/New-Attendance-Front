import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DsaComponent } from './dsa.component';
import { dsaGuard } from '../../guards/dsa.guard';

const routes: Routes = [
  {
    path: '',
    component: DsaComponent,
    canActivate: [dsaGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DsaRoutingModule { }
