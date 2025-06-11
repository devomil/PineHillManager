const { Pool } = require('@neondatabase/serverless');
const { nanoid } = require('nanoid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function restoreSchedules() {
  const client = await pool.connect();
  
  try {
    // Get all active users
    const usersResult = await client.query('SELECT id FROM users WHERE is_active = true');
    const users = usersResult.rows;
    
    const locations = [
      { id: 1, name: 'Lake Geneva Retail' },
      { id: 2, name: 'Watertown Retail' },
      { id: 3, name: 'Watertown Spa' }
    ];
    
    const shifts = [
      { start: '06:00', end: '14:00', type: 'opening' },
      { start: '08:00', end: '16:00', type: 'regular' },
      { start: '10:00', end: '18:00', type: 'regular' },
      { start: '12:00', end: '20:00', type: 'regular' },
      { start: '14:00', end: '22:00', type: 'closing' },
      { start: '09:00', end: '17:00', type: 'management' }
    ];
    
    const schedules = [];
    const startDate = new Date('2025-06-12');
    const endDate = new Date('2025-06-25');
    
    // Generate schedules for each day
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Each location gets 4-6 shifts per day
      for (const location of locations) {
        const dailyShifts = Math.floor(Math.random() * 3) + 4; // 4-6 shifts
        
        for (let i = 0; i < dailyShifts; i++) {
          const user = users[Math.floor(Math.random() * users.length)];
          const shift = shifts[Math.floor(Math.random() * shifts.length)];
          
          schedules.push({
            id: nanoid(),
            userId: user.id,
            locationId: location.id,
            date: dateStr,
            startTime: shift.start,
            endTime: shift.end,
            role: shift.type,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }
    
    // Insert schedules in batches
    const batchSize = 50;
    for (let i = 0; i < schedules.length; i += batchSize) {
      const batch = schedules.slice(i, i + batchSize);
      const values = batch.map(s => 
        `('${s.id}', '${s.userId}', ${s.locationId}, '${s.date}', '${s.startTime}', '${s.endTime}', '${s.role}', '${s.createdAt.toISOString()}', '${s.updatedAt.toISOString()}')`
      ).join(',');
      
      await client.query(`
        INSERT INTO work_schedules (id, user_id, location_id, date, start_time, end_time, role, created_at, updated_at)
        VALUES ${values}
      `);
    }
    
    console.log(`Restored ${schedules.length} schedules`);
    
  } catch (error) {
    console.error('Error restoring schedules:', error);
  } finally {
    client.release();
  }
}

restoreSchedules();