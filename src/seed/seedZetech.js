
import fetch from 'node-fetch';

async function seedZetech() {
  // 1. Create Zetech University
  const schoolRes = await fetch('http://localhost:5000/api/schools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Zetech University',
      logo_url: 'https://www.zetech.ac.ke/sites/default/files/zetech-logo.png',
      website_url: 'https://www.zetech.ac.ke/',
      portal_url: 'https://student.zetech.ac.ke/',
      student_email: 'student@zetech.ac.ke',
      student_number: 'ZET2026-001',
      phone: '',
      status: 'Graduated'
    })
  });
  if (!schoolRes.ok) {
    console.error('Failed to create Zetech University:', await schoolRes.text());
    return;
  }
  const { id: school_id } = await schoolRes.json();
  console.log('Created Zetech University with id', school_id);

  // 2. Create units
  const units = [
    { name: 'Operating System', classroom: 'L202' },
    { name: 'CCNA1' },
    { name: 'CCNA2' },
    { name: 'C++ Programming' },
    { name: 'Java Programming' },
    { name: 'Artificial Intelligence' }
  ];
  const unitIds = [];
  for (const unit of units) {
    const unitRes = await fetch('http://localhost:5000/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id,
        name: unit.name,
        lecturer: '',
        schedule: unit.classroom || '',
        progress: 0,
        status: 'Active'
      })
    });
    if (!unitRes.ok) {
      console.error('Failed to create unit', unit.name, await unitRes.text());
      continue;
    }
    const { id: unit_id } = await unitRes.json();
    unitIds.push({ name: unit.name, unit_id });
  }
  console.log('Created units:', unitIds);

  // 3. Create assignments (linked to units)
  const assignments = [
    { title: 'OS Assignment 1', unit: 'Operating System', due_date: '2026-02-10', status: 'pending', description: 'First OS assignment.' },
    { title: 'CCNA1 Lab Report', unit: 'CCNA1', due_date: '2026-02-15', status: 'pending', description: 'Lab report for CCNA1.' }
  ];
  for (const a of assignments) {
    const unit = unitIds.find(u => u.name === a.unit);
    if (!unit) continue;
    const assignRes = await fetch('http://localhost:5000/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: unit.unit_id,
        title: a.title,
        due_date: a.due_date,
        status: a.status,
        description: a.description
      })
    });
    if (!assignRes.ok) {
      console.error('Failed to create assignment', a.title, await assignRes.text());
    }
  }
  console.log('Created assignments');

  // 4. Create labs (linked to units)
  const labs = [
    { name: 'VirtualBox Lab', platform: 'Home Lab', status: 'completed', unit: 'Operating System' },
    { name: 'OS Home Lab', platform: 'Home Lab', status: 'completed', unit: 'Operating System' }
  ];
  for (const l of labs) {
    const unit = unitIds.find(u => u.name === l.unit);
    if (!unit) continue;
    const labRes = await fetch('http://localhost:5000/api/labs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit_id: unit.unit_id,
        name: l.name,
        platform: l.platform,
        status: l.status,
        score: 100,
        due_date: '2026-02-20'
      })
    });
    if (!labRes.ok) {
      console.error('Failed to create lab', l.name, await labRes.text());
    }
  }
  console.log('Created labs');

  // 5. Create a report (exam/transcript)
  const reports = [
    { type: 'Semester Report', date: '2025-12-01', gpa: 3.5, grade_summary: 'Upper Credit B', file_url: '' }
  ];
  for (const r of reports) {
    const reportRes = await fetch('http://localhost:5000/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id,
        type: r.type,
        date: r.date,
        gpa: r.gpa,
        grade_summary: r.grade_summary,
        file_url: r.file_url
      })
    });
    if (!reportRes.ok) {
      console.error('Failed to create report', r.type, await reportRes.text());
    }
  }
  console.log('Created reports');

  console.log('Zetech University and all related data seeded successfully!');
}

seedZetech();