import db from '../config/db.js';
import { getIO } from '../socket.js';

function currentUserId(req) {
  return Number(req.user?.id || req.user?.user_id || 0);
}

function emitJobsUpdate(userId, payload) {
  const io = getIO();
  if (!io) return;
  io.emit('jobs_updated', {
    userId,
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

function normalizeJob(source, job) {
  return {
    source,
    external_job_id: String(job.id || job.slug || `${source}-${job.title || ''}-${job.company || job.company_name || ''}`),
    title: job.title || 'Untitled Role',
    company: job.company || job.company_name || job.organization || 'Unknown',
    location: job.location || job.candidate_required_location || 'Unknown',
    url: job.url || job.absolute_url || job.hostedUrl || '',
    description: job.description || job.content || '',
    category: job.category || job.commitment || 'General',
    published_at: job.published_at || job.publication_date || job.created_at || null,
    tags: Array.isArray(job.tags) ? job.tags : [],
  };
}

async function fetchRemotiveJobs(q = '') {
  const params = new URLSearchParams();
  if (q) params.append('search', q);
  const res = await fetch(`https://remotive.com/api/remote-jobs?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.jobs || []).map((job) => normalizeJob('Remotive', job));
}

async function fetchArbeitnowJobs() {
  const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data || []).map((job) => normalizeJob('Arbeitnow', job));
}

async function fetchAdzunaJobs(q = '', country = 'gb') {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const endpoint = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}&results_per_page=20&what=${encodeURIComponent(q || 'software engineer')}`;
  const res = await fetch(endpoint);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || []).map((job) => normalizeJob('Adzuna', {
    id: job.id,
    title: job.title,
    company: job.company?.display_name,
    location: job.location?.display_name,
    url: job.redirect_url,
    description: job.description,
    category: job.category?.label,
    created_at: job.created,
    tags: [job.contract_type, job.contract_time].filter(Boolean),
  }));
}

async function fetchGreenhouseJobs() {
  const boards = (process.env.GREENHOUSE_BOARDS || '').split(',').map((b) => b.trim()).filter(Boolean);
  if (boards.length === 0) return [];

  const settled = await Promise.allSettled(
    boards.map(async (board) => {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.jobs || []).map((job) => normalizeJob('Greenhouse', {
        id: `${board}-${job.id}`,
        title: job.title,
        company: board,
        location: job.location?.name,
        absolute_url: job.absolute_url,
        content: job.content,
        updated_at: job.updated_at,
      }));
    })
  );

  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}

async function fetchLeverJobs() {
  const companies = (process.env.LEVER_COMPANIES || '').split(',').map((b) => b.trim()).filter(Boolean);
  if (companies.length === 0) return [];

  const settled = await Promise.allSettled(
    companies.map(async (company) => {
      const res = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((job) => normalizeJob('Lever', {
        id: `${company}-${job.id}`,
        title: job.text,
        company,
        location: job.categories?.location,
        hostedUrl: job.hostedUrl,
        description: job.descriptionPlain,
        commitment: job.categories?.commitment,
        created_at: job.createdAt ? new Date(job.createdAt).toISOString() : null,
      }));
    })
  );

  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}

export async function getCareerProfile(req, res) {
  try {
    const userId = currentUserId(req);
    const [rows] = await db.execute('SELECT * FROM career_profiles WHERE user_id = ? LIMIT 1', [userId]);
    res.json(rows[0] || null);
  } catch (error) {
    console.error('getCareerProfile error', error);
    res.status(500).json({ message: 'Failed to fetch career profile' });
  }
}

export async function upsertCareerProfile(req, res) {
  try {
    const userId = currentUserId(req);
    const {
      full_name,
      current_role,
      target_role,
      location,
      skills,
      portfolio,
      education,
      experience_summary,
    } = req.body || {};

    await db.execute(
      `INSERT INTO career_profiles (user_id, full_name, current_role, target_role, location, skills, portfolio, education, experience_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        current_role = VALUES(current_role),
        target_role = VALUES(target_role),
        location = VALUES(location),
        skills = VALUES(skills),
        portfolio = VALUES(portfolio),
        education = VALUES(education),
        experience_summary = VALUES(experience_summary)`,
      [userId, full_name || null, current_role || null, target_role || null, location || null, skills || null, portfolio || null, education || null, experience_summary || null]
    );

    const [rows] = await db.execute('SELECT * FROM career_profiles WHERE user_id = ? LIMIT 1', [userId]);
    emitJobsUpdate(userId, { entity: 'career_profile', action: 'upsert' });
    res.json(rows[0]);
  } catch (error) {
    console.error('upsertCareerProfile error', error);
    res.status(500).json({ message: 'Failed to save career profile' });
  }
}

export async function fetchProviderJobs(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    const country = String(req.query.country || 'gb').toLowerCase();

    const settled = await Promise.allSettled([
      fetchRemotiveJobs(q),
      fetchArbeitnowJobs(),
      fetchAdzunaJobs(q, country),
      fetchGreenhouseJobs(),
      fetchLeverJobs(),
    ]);

    const jobs = settled.flatMap((item) => (item.status === 'fulfilled' ? item.value : []));
    const unique = new Map();
    jobs.forEach((job) => {
      const key = `${job.source}-${job.external_job_id}`;
      if (!unique.has(key)) unique.set(key, job);
    });

    const filtered = Array.from(unique.values()).filter((job) => {
      if (!q) return true;
      const haystack = [job.title, job.company, job.location, job.description || '', ...(job.tags || [])].join(' ').toLowerCase();
      return haystack.includes(q.toLowerCase());
    });

    res.json({ jobs: filtered.slice(0, 80) });
  } catch (error) {
    console.error('fetchProviderJobs error', error);
    res.status(500).json({ message: 'Failed to fetch provider jobs' });
  }
}

export async function getJobApplications(req, res) {
  try {
    const userId = currentUserId(req);
    const [rows] = await db.execute('SELECT * FROM job_applications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('getJobApplications error', error);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
}

export async function createJobApplication(req, res) {
  try {
    const userId = currentUserId(req);
    const {
      provider,
      external_job_id,
      title,
      company,
      location,
      job_url,
      status,
      applied_at,
      deadline,
      interview_at,
      feedback,
      notes,
      match_score,
    } = req.body || {};

    const [result] = await db.execute(
      `INSERT INTO job_applications
        (user_id, provider, external_job_id, title, company, location, job_url, status, applied_at, deadline, interview_at, feedback, notes, match_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        company = VALUES(company),
        location = VALUES(location),
        job_url = VALUES(job_url),
        status = VALUES(status),
        applied_at = VALUES(applied_at),
        deadline = VALUES(deadline),
        interview_at = VALUES(interview_at),
        feedback = VALUES(feedback),
        notes = VALUES(notes),
        match_score = VALUES(match_score),
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        provider || null,
        external_job_id || null,
        title,
        company || null,
        location || null,
        job_url || null,
        status || 'Saved',
        applied_at || null,
        deadline || null,
        interview_at || null,
        feedback || null,
        notes || null,
        match_score ?? null,
      ]
    );

    let rows;
    if (result.insertId) {
      [rows] = await db.execute('SELECT * FROM job_applications WHERE id = ?', [result.insertId]);
    } else {
      [rows] = await db.execute('SELECT * FROM job_applications WHERE user_id = ? AND provider <=> ? AND external_job_id <=> ? LIMIT 1', [userId, provider || null, external_job_id || null]);
    }
    emitJobsUpdate(userId, {
      entity: 'job_application',
      action: result.insertId ? 'create' : 'upsert',
      applicationId: rows[0]?.id || null,
    });
    res.status(201).json(rows[0] || null);
  } catch (error) {
    console.error('createJobApplication error', error);
    res.status(500).json({ message: 'Failed to create application' });
  }
}

export async function updateJobApplication(req, res) {
  try {
    const userId = currentUserId(req);
    const { id } = req.params;
    const allowed = ['status', 'applied_at', 'deadline', 'interview_at', 'feedback', 'notes', 'match_score', 'title', 'company', 'location', 'job_url'];
    const fields = [];
    const values = [];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(req.body[key]);
      }
    }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(id, userId);
    await db.execute(`UPDATE job_applications SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);

    const [rows] = await db.execute('SELECT * FROM job_applications WHERE id = ? AND user_id = ?', [id, userId]);
    emitJobsUpdate(userId, {
      entity: 'job_application',
      action: 'update',
      applicationId: Number(id),
    });
    res.json(rows[0] || null);
  } catch (error) {
    console.error('updateJobApplication error', error);
    res.status(500).json({ message: 'Failed to update application' });
  }
}

export async function deleteJobApplication(req, res) {
  try {
    const userId = currentUserId(req);
    const { id } = req.params;
    await db.execute('DELETE FROM job_applications WHERE id = ? AND user_id = ?', [id, userId]);
    emitJobsUpdate(userId, {
      entity: 'job_application',
      action: 'delete',
      applicationId: Number(id),
    });
    res.json({ success: true });
  } catch (error) {
    console.error('deleteJobApplication error', error);
    res.status(500).json({ message: 'Failed to delete application' });
  }
}

export async function getJobReminders(req, res) {
  try {
    const userId = currentUserId(req);
    const [rows] = await db.execute('SELECT * FROM job_reminders WHERE user_id = ? ORDER BY remind_at ASC', [userId]);
    res.json(rows);
  } catch (error) {
    console.error('getJobReminders error', error);
    res.status(500).json({ message: 'Failed to fetch reminders' });
  }
}

export async function createJobReminder(req, res) {
  try {
    const userId = currentUserId(req);
    const { application_id, reminder_type, remind_at, message } = req.body || {};
    const [result] = await db.execute(
      'INSERT INTO job_reminders (user_id, application_id, reminder_type, remind_at, message) VALUES (?, ?, ?, ?, ?)',
      [userId, application_id || null, reminder_type || 'application', remind_at, message]
    );
    const [rows] = await db.execute('SELECT * FROM job_reminders WHERE id = ?', [result.insertId]);
    emitJobsUpdate(userId, {
      entity: 'job_reminder',
      action: 'create',
      reminderId: rows[0]?.id || null,
      applicationId: application_id || null,
    });
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('createJobReminder error', error);
    res.status(500).json({ message: 'Failed to create reminder' });
  }
}
