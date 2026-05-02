/// <reference lib="webworker" />

import { Attendance } from "./models/entities/attendance";

addEventListener('message', ({ data }: { data: Attendance[] }) => {
  let report: Attendance[] = []
  for (let a of data) {
    let item: Attendance = {
      student_sis_id: a.student_sis_id,
      firstName: a.firstName,
      lastName: a.lastName,
      course_sis_id: a.course_sis_id,
      attendance: a.attendance,
      count: data.filter(i => i.student_sis_id === a.student_sis_id && i.course_sis_id === a.course_sis_id && i.attendance === a.attendance).length,
      seniority: a.seniority,
      marked_by_sis_id: a.marked_by_sis_id,
      course_name: a.course_name,
      status: a.status,
      grade: a.grade,
      instructor_name: a.instructor_name,
      absentLimit: a.absentLimit,
      marked_at: a.marked_at,
      marked_time: a.marked_time,
      trmCde: a.trmCde
    }
    // if (a.wf_requested_on)
    //   item.wf_requested_on = a.wf_requested_on
    // if (a.wf_approved_on)
    //   item.wf_approved_on = a.wf_approved_on
    if (!report.filter(i => i.student_sis_id === item.student_sis_id && i.course_sis_id === item.course_sis_id && i.attendance === item.attendance).length)
      report.push(item)
  }
  postMessage(report);
});
