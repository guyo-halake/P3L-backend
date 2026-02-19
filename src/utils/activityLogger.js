import db from '../config/db.js';
import { getIO } from '../socket.js';

export const logActivity = async (type, description, meta = {}) => {
    try {
        // 1. Log to Database
        const [result] = await db.execute(
            'INSERT INTO system_activities (type, description, meta, created_at) VALUES (?, ?, ?, NOW())',
            [type, description, JSON.stringify(meta)]
        );

        // 2. Broadcast via Socket.IO
        const io = getIO();
        if (io) {
            const activityPayload = {
                id: result.insertId,
                type,
                description,
                meta,
                created_at: new Date().toISOString()
            };
            io.emit('system_activity', activityPayload);
        }

    } catch (error) {
        console.error('Failed to log system activity:', error);
        // Don't throw, just log error so main flow isn't interrupted
    }
};
