import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FilrterRequest } from '../models/dto/filterRequest';
import { Attendance } from '../models/entities/attendance';
import { environment } from '../../environments/environment';
import { InitData } from '../models/dto/initData';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  constructor(
    private http: HttpClient,
  ) { }

  filterAttendance(filter: FilrterRequest) {
    return this.http.post<Attendance[]>(environment.filterUrl, filter);
  }

  getInitData() {
    return this.http.get<InitData>(environment.initUrl);
  }
}
