import { Injectable } from '@angular/core';
import { IDBPDatabase, openDB } from 'idb';
import { Attendance } from '../models/entities/attendance';

@Injectable({
  providedIn: 'root'
})
export class IndexeddbService {

  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = this.initDB()
  }

  private async initDB() {
    return openDB('AttendanceDB', 1, {
      upgrade(db) {
        // Create the 'absences' object store if it doesn't exist
        if (!db.objectStoreNames.contains('attendance')) {
          const store = db.createObjectStore('attendance', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('list', 'id');
        }
      },
    });
  }

  async addAttendance(attendances: Attendance[]) {
    const db = await this.dbPromise;
    const tx = db.transaction('attendance', 'readwrite');
    await tx.store.clear(); // Clears all records
    for (const attendance of attendances) {
      await tx.store.add(attendance);
    }
    await tx.done;
  }

  async getAttendances(): Promise<Attendance[]> {
    const db = await this.dbPromise;
    return db.getAll('attendance');
  }

  async deleteByKey(key: number) {
    const db = await this.dbPromise;
    const tx = db.transaction('attendance', 'readwrite');
    await tx.store.delete(key);
    await tx.done;
  }

  async clearAttendances() {
    const db = await this.dbPromise;
    const tx = db.transaction('attendance', 'readwrite');
    await tx.store.clear();
    await tx.done;
  }
}
