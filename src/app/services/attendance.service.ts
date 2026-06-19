import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FilrterRequest } from '../models/dto/filterRequest';
import { Attendance } from '../models/entities/attendance';
import { environment } from '../../environments/environment';
import { InitData } from '../models/dto/initData';
import { AuthRequest } from '../models/dto/authRequest';
import { Wflist } from '../models/entities/wflist';
import { BehaviorSubject } from 'rxjs';
import { WflistResponse } from '../models/dto/wflistResponse';
import { StudentTracking } from '../models/entities/studentTracking';
import { SearchDto } from '../models/dto/searchDto';
import { StudentAttendanceDetails } from '../models/dto/studentAttendanceDetails';
import { RedFlagStudents } from '../models/dto/reFlagStudent';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {

  constructor(
    private http: HttpClient,
  ) { }

  attendanceSource = new BehaviorSubject<Attendance[]>([])
  attendance$ = this.attendanceSource.asObservable()

  attendanceFilterSource = new BehaviorSubject<SearchDto>({trmCde: 'SU', studentIds: [], courses: [], seniorities: []})
  attendanceFilter$ = this.attendanceFilterSource.asObservable()

  filterAttendance(filter: FilrterRequest) {
    const auth = this.getAuthRequest()
    filter.userId = auth.id
    filter.userEmail = auth.email
    return this.http.post<Attendance[]>(environment.filterUrl, filter);
  }

  getInitData() {
    return this.http.post<InitData[]>(environment.initUrl, this.getAuthRequest());
  }

  getStudentList() {
    return this.http.post<Attendance[]>(environment.wflistUrl, this.getAuthRequest())
  }

  addToWflist(student: Wflist) {
    return this.http.post<Wflist>(environment.addWflistUrl, student)
  }

  getWflist() {
    return this.http.post<WflistResponse[]>(environment.WflistUrl, this.getAuthRequest())
  }

  withdrawStudent(student: Attendance) {
    return this.http.post<boolean>(environment.WithdrawUrl, {auth: this.getAuthRequest(), attendance: student})
  }

  withdrawManyStudents(students: Attendance[]) {
    return this.http.post<boolean[]>(environment.WithdrawManyUrl, {auth: this.getAuthRequest(), attendance: students})
  }

  refuseRequest(student: Wflist) {
    return this.http.post<boolean>(environment.refuseUrl, student)
  }

  trackStudent(request: StudentTracking) {
    return this.http.post<StudentTracking>(environment.trackingUrl + '/track', request)
  }

  trackStudents(request: StudentTracking[]) {
    return this.http.post<{ students: StudentTracking[] }>(environment.trackingUrl + '/tracks', { students: request })
  }

  getTracking() {
    return this.http.get<StudentTracking[]>(environment.trackingUrl + '/get')
  }

  updateTracking(request: StudentTracking) {
    return this.http.put<StudentTracking>(environment.trackingUrl + '/update', request)
  }

  deleteTracking(id: number) {
    return this.http.delete<boolean>(environment.trackingUrl + '/delete/' + id)
  }

  getStudentsInfo(trm: string) {
    return this.http.get<StudentAttendanceDetails[]>(environment.trackingUrl + '/info/' + trm)
  }

  getRedFlagStudents() {
    return this.http.get<RedFlagStudents[]>(environment.trackingUrl + '/red-flag')
  }

  getAuthRequest() {
    const id = localStorage.getItem('id')
    const email = localStorage.getItem('email')
    let request: AuthRequest = {
      id: undefined,
      email: ''
    }
    if (id)
      request.id = +id
    if (email)
      request.email = email
    return request
  }
}
