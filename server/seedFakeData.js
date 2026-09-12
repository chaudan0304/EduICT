/**
 * Script sinh dữ liệu mẫu (Seed Data) cho EduICT
 * Dữ liệu được sinh là HOÀN TOÀN GIẢ ĐỊNH (Mock/Demo):
 * - Tên học sinh giả định, sinh nhật giả định (2014 - 2018)
 * - 5 lớp học tiểu học đại diện (1A1 - 5A1)
 * - Bài học mẫu Tin học GDPT 2018
 * - Ngân hàng câu hỏi trắc nghiệm Tin học
 *
 * Cách chạy: node server/seedFakeData.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, getDatabasePath } from './db.js';

console.log('====================================================');
console.log('🚀 EduICT - Khởi tạo CSDL Mẫu (Seed Fake Data)');
console.log('====================================================');

const dbPath = getDatabasePath();
console.log(`📁 Đường dẫn CSDL đích: ${dbPath}`);

// Khởi tạo kết nối CSDL và nạp schema & dữ liệu mẫu
const db = getDatabase();

const classCount = db.prepare('SELECT COUNT(*) as count FROM classes;').get().count;
const studentCount = db.prepare('SELECT COUNT(*) as count FROM students;').get().count;
const lessonCount = db.prepare('SELECT COUNT(*) as count FROM lessons;').get().count;
const questionCount = db.prepare('SELECT COUNT(*) as count FROM question_bank;').get().count;

console.log('✅ Khởi tạo CSDL hoàn tất thành công!');
console.log(`   - Tổng số lớp học mẫu: ${classCount}`);
console.log(`   - Tổng số học sinh giả định: ${studentCount}`);
console.log(`   - Tổng số bài học GDPT 2018: ${lessonCount}`);
console.log(`   - Tổng số câu hỏi ngân hàng: ${questionCount}`);
console.log('🔒 CSDL hiện tại KHÔNG chứa bất kỳ thông tin cá nhân thực tế nào.');
console.log('====================================================');
