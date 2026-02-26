import db from '../config/db.js';
import { getIO } from '../socket.js';

let fetchFn;
async function getFetch() {
    if (!fetchFn) fetchFn = (await import('node-fetch')).default;
    return fetchFn;
}

/**
 * Sync online platform data for a school.
 * POST /api/schools/:id/sync
 */
export const syncOnlinePlatform = async (req, res) => {
    try {
        const schoolId = req.params.id;
        const [schoolRows] = await db.query('SELECT * FROM schools WHERE id = ?', [schoolId]);
        if (schoolRows.length === 0) return res.status(404).json({ error: 'School not found' });

        const school = schoolRows[0];
        if (school.type !== 'online' || !school.platform || !school.platform_username) {
            return res.status(400).json({ error: 'This school is not an online platform or missing credentials' });
        }

        const fetch = await getFetch();
        let syncResult = { units_synced: 0, profile: null };

        // ─── TRYHACKME ───
        if (school.platform === 'tryhackme') {
            const username = school.platform_username;

            // Fetch profile
            const profileRes = await fetch(`https://tryhackme.com/api/v2/users/${encodeURIComponent(username)}`);
            if (!profileRes.ok) return res.status(400).json({ error: 'Could not fetch TryHackMe profile. Check username.' });
            const profile = await profileRes.json();

            // Fetch completed rooms
            const roomsRes = await fetch(`https://tryhackme.com/api/v2/users/${encodeURIComponent(username)}/completed-rooms`);
            let rooms = [];
            if (roomsRes.ok) {
                const roomsData = await roomsRes.json();
                rooms = roomsData.data || roomsData || [];
            }

            // Get existing units for this school
            const [existingUnits] = await db.query('SELECT name FROM school_units WHERE school_id = ?', [schoolId]);
            const existingNames = new Set(existingUnits.map(u => u.name));

            // Insert new rooms as units
            let added = 0;
            for (const room of rooms) {
                const roomName = room.title || room.name || room.roomCode || 'Unknown Room';
                if (!existingNames.has(roomName)) {
                    await db.query(
                        'INSERT INTO school_units (school_id, name, lecturer, schedule, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
                        [schoolId, roomName, 'TryHackMe', 'Self-paced', 100, 'Completed']
                    );
                    added++;
                }
            }

            // Update school progress based on profile
            const rank = profile.data?.rank || profile.rank || null;
            if (rank) {
                await db.query('UPDATE schools SET status = ? WHERE id = ?', [`Rank #${rank}`, schoolId]);
            }

            syncResult = { units_synced: added, total_rooms: rooms.length, profile: profile.data || profile };
        }

        // ─── HACKTHEBOX ───
        else if (school.platform === 'hackthebox') {
            const token = school.platform_username; // HTB uses API token

            // Fetch profile
            const profileRes = await fetch('https://labs.hackthebox.com/api/v4/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!profileRes.ok) return res.status(400).json({ error: 'Could not fetch HTB profile. Check API token.' });
            const profile = await profileRes.json();

            // Fetch completed machines
            const machinesRes = await fetch('https://labs.hackthebox.com/api/v4/profile/activity', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let machines = [];
            if (machinesRes.ok) {
                const machData = await machinesRes.json();
                machines = machData.profile?.activity || [];
            }

            // Get existing units
            const [existingUnits] = await db.query('SELECT name FROM school_units WHERE school_id = ?', [schoolId]);
            const existingNames = new Set(existingUnits.map(u => u.name));

            let added = 0;
            for (const m of machines) {
                const machineName = m.name || m.object_type || 'Unknown';
                if (!existingNames.has(machineName) && m.type === 'own') {
                    await db.query(
                        'INSERT INTO school_units (school_id, name, lecturer, schedule, progress, status) VALUES (?, ?, ?, ?, ?, ?)',
                        [schoolId, machineName, 'HackTheBox', 'Self-paced', 100, 'Completed']
                    );
                    added++;
                }
            }

            syncResult = { units_synced: added, profile: profile.profile || profile };
        }

        else {
            return res.status(400).json({ error: `Platform "${school.platform}" does not support auto-sync yet.` });
        }

        // Emit real-time refresh
        const io = getIO();
        io && io.emit('academic_unit_added', { school_id: schoolId });
        io && io.emit('school_updated', { id: schoolId });

        res.json({ success: true, ...syncResult });
    } catch (err) {
        console.error('Platform sync error:', err);
        res.status(500).json({ error: 'Sync failed: ' + (err.message || 'Unknown error') });
    }
};
