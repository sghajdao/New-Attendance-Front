import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: "",
    loadChildren:()=>import("./components/home/home.module").then(m=>m.HomeModule),
  },
  {
    path: "form",
    loadChildren:()=>import("./components/form/form.module").then(m=>m.FormModule),
  },
  {
    path: "wf",
    loadChildren:()=>import("./components/withdraw/withdraw.module").then(m=>m.WithdrawModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
