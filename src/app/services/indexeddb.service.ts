import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';
import { StudentAttendanceDetails } from '../models/dto/studentAttendanceDetails';
import { AttendanceService } from './attendance.service';

@Injectable({
  providedIn: 'root'
})
export class IndexeddbService {

  private dbPromise: Promise<IDBPDatabase>;

  constructor(
    private attendanceService: AttendanceService,
  ) {
    this.dbPromise = this.initDB()
  }

  private async initDB() {
    return openDB('StudentsInfoDB', 1, {
      upgrade(db) {
        // Create the 'absences' object store if it doesn't exist
        if (!db.objectStoreNames.contains('FA')) {
          const store = db.createObjectStore('FA', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('list', 'id');
        }
        if (!db.objectStoreNames.contains('WI')) {
          const store = db.createObjectStore('WI', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('list', 'id');
        }
        if (!db.objectStoreNames.contains('SP')) {
          const store = db.createObjectStore('SP', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('list', 'id');
        }
      },
    });
  }

  async addData(data: StudentAttendanceDetails[], storeName: string) {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear(); // Clears all records
    for (const item of data) {
      await tx.store.add(item);
    }
    await tx.done;
  }

  async getData(storeName: string): Promise<StudentAttendanceDetails[]> {
    const db = await this.dbPromise;
    return db.getAll(storeName);
  }

  async getByStudentId(studentId: string, courseSisId: string, termCode: string): Promise<StudentAttendanceDetails[]> {
    const db = await this.dbPromise;
    const allRecords = await db.getAll(termCode);
    return allRecords.filter(record => record.idNum === studentId && 'SP26-' + record.crsCde.replaceAll(" ", "") === courseSisId);
  }

  async updateItem(item: StudentAttendanceDetails) {
    const db = await this.dbPromise;
    const tx = db.transaction('info', 'readwrite');
    tx.store.put(item)
  }

  async deleteByKey(key: number) {
    const db = await this.dbPromise;
    const tx = db.transaction('info', 'readwrite');
    await tx.store.delete(key);
    await tx.done;
  }

  async clearData(storeName: string) {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}
