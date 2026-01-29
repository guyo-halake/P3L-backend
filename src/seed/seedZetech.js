import fetch from 'node-fetch';

const schoolPayload = {
  name: "Zetech University",
  logo: "https://www.zetech.ac.ke/sites/default/files/zetech-logo.png",
  summary: "Information Technology",
  website_url: "https://www.zetech.ac.ke/",
  portal_url: "https://student.zetech.ac.ke/",
  student_email: "student@zetech.ac.ke",
  student_number: "ZET2026-001",
  phone: "",
  status: "Graduated",
  gpa: 3.5,
  avgGrade: "Upper Credit B",
  progress: 97,
  feesBalance: 0,
  units: [
    { name: "Operating System", classroom: "L202" },
    { name: "CCNA1" },
    { name: "CCNA2" },
    { name: "C++ Programming" },
    { name: "Java Programming" },
    { name: "Artificial Intelligence" }
  ],
  assignments: [
    { title: "OS Assignment 1", unit: "Operating System", dueDate: "2026-02-10", status: "pending" },
    { title: "CCNA1 Lab Report", unit: "CCNA1", dueDate: "2026-02-15", status: "pending" }
  ],
  labs: [
    { name: "VirtualBox Lab", platform: "Home Lab", status: "completed" },
    { name: "OS Home Lab", platform: "Home Lab", status: "completed" }
  ],
  transcripts: [
    { type: "Semester Report", date: "2025-12-01", gpa: 3.5, grade: "Upper Credit B", source: "upload" }
  ]
};

async function seedZetech() {
  const res = await fetch("http://localhost:5000/api/schools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(schoolPayload)
  });
  if (res.ok) {
    console.log("Zetech University seeded successfully");
  } else {
    const err = await res.text();
    console.error("Failed to seed Zetech University:", err);
  }
}

seedZetech();