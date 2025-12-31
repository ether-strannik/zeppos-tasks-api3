/**
 * VALARM Parser
 *
 * Parses CalDAV VALARM TRIGGER values and calculates absolute trigger times
 * for app-based reminder system.
 *
 * Supports RFC 5545 duration format:
 * - -PT15M (15 minutes before)
 * - -PT1H (1 hour before)
 * - -PT1H30M (1 hour 30 minutes before)
 * - -P1D (1 day before)
 */

/**
 * Parse VALARM TRIGGER values from CalDAV task
 *
 * @param {Object} task - CalDAV task object with valarm property
 * @returns {Array} Array of trigger offset objects
 */
export function parseVALARM(task) {
    if (!task.valarm || task.valarm.length === 0) {
        return [];
    }

    const triggers = [];

    for (const alarm of task.valarm) {
        if (!alarm.trigger) {
            continue;
        }

        // Parse ISO 8601 duration format
        // Format: [-]P[nD]T[nH][nM][nS]
        const match = alarm.trigger.match(/^(-)?P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

        if (match) {
            const negative = match[1] === '-';
            const days = parseInt(match[2] || 0);
            const hours = parseInt(match[3] || 0);
            const minutes = parseInt(match[4] || 0);
            const seconds = parseInt(match[5] || 0);

            // Convert all components to total minutes
            let totalMinutes = (days * 24 * 60) + (hours * 60) + minutes + Math.floor(seconds / 60);

            if (negative) {
                totalMinutes = -totalMinutes;
            }

            triggers.push({
                offset: totalMinutes,
                unit: 'minutes',
                original: alarm.trigger
            });
        }
    }

    return triggers;
}

/**
 * Calculate absolute trigger times from VALARM offsets
 *
 * @param {Object} task - CalDAV task with due date and valarm
 * @returns {Array} Array of Date objects representing trigger times
 */
export function calculateTriggerTimes(task) {
    // CalDAV tasks use task.dueDate, not task.due
    const due = task.dueDate || task.due;

    if (!due) {
        return [];
    }

    const dueDate = new Date(due);

    if (isNaN(dueDate.getTime())) {
        return [];
    }

    // Try to get triggers from task.valarm first (CalDAV VALARM array)
    let triggers = parseVALARM(task);

    // If no valarm triggers found, try to use task.alarm (UI reminder property)
    if (triggers.length === 0 && task.alarm !== null && task.alarm !== undefined) {
        // task.alarm can be:
        // - An object { type: 'relative', minutes: X } (minutes before due)
        // - An object { type: 'absolute', date: X } (absolute time)
        // - A number (minutes before due, legacy format)
        // - A Date object (absolute time, legacy format)
        // - 0 (at due time)
        if (typeof task.alarm === 'object' && task.alarm !== null) {
            if (task.alarm.type === 'relative' && typeof task.alarm.minutes === 'number') {
                // Relative alarm: minutes before due
                const minutes = task.alarm.minutes;
                triggers = [{ offset: -Math.abs(minutes), unit: 'minutes' }];
            } else if (task.alarm.type === 'absolute' && task.alarm.date) {
                // Absolute alarm: specific date/time
                const alarmDate = new Date(task.alarm.date);
                if (!isNaN(alarmDate.getTime())) {
                    const offsetMs = alarmDate.getTime() - dueDate.getTime();
                    const offsetMinutes = Math.floor(offsetMs / (60 * 1000));
                    triggers = [{ offset: offsetMinutes, unit: 'minutes' }];
                }
            }
        } else if (typeof task.alarm === 'number') {
            // Legacy format: Offset in minutes (negative = before due)
            triggers = [{ offset: -Math.abs(task.alarm), unit: 'minutes' }];
        } else if (task.alarm instanceof Date || typeof task.alarm === 'string') {
            // Legacy format: Absolute time - calculate offset from due date
            const alarmDate = new Date(task.alarm);
            if (!isNaN(alarmDate.getTime())) {
                const offsetMs = alarmDate.getTime() - dueDate.getTime();
                const offsetMinutes = Math.floor(offsetMs / (60 * 1000));
                triggers = [{ offset: offsetMinutes, unit: 'minutes' }];
            }
        }
    }

    if (triggers.length === 0) {
        return [];
    }

    const triggerTimes = triggers.map(trigger => {
        // offset is in minutes, convert to milliseconds
        const offsetMs = trigger.offset * 60 * 1000;
        return new Date(dueDate.getTime() + offsetMs);
    });

    return triggerTimes;
}

/**
 * Check if task has valid VALARM triggers for app-based reminders
 *
 * @param {Object} task - CalDAV task
 * @returns {boolean} True if task has due date and reminder (alarm or valarm)
 */
export function hasValidVALARM(task) {
    // Task needs a due date
    // CalDAV tasks use task.dueDate, not task.due
    const dueDate = task.dueDate || task.due;

    if (!dueDate) {
        return false;
    }

    // Accept either task.valarm (CalDAV VALARM array) or task.alarm (UI reminder property)
    // task.valarm might not be populated until task syncs, but task.alarm is set immediately
    const hasValarm = task.valarm && task.valarm.length > 0;

    // task.alarm can be an object { type, minutes/date } or legacy number/Date
    let hasAlarm = false;
    if (task.alarm !== null && task.alarm !== undefined) {
        if (typeof task.alarm === 'object') {
            // Object format: { type: 'relative', minutes: X } or { type: 'absolute', date: X }
            hasAlarm = (task.alarm.type === 'relative' && typeof task.alarm.minutes === 'number') ||
                       (task.alarm.type === 'absolute' && task.alarm.date);
        } else {
            // Legacy format: number or Date
            hasAlarm = true;
        }
    }

    return hasValarm || hasAlarm;
}

/**
 * Format trigger offset for display
 *
 * @param {number} offsetMinutes - Offset in minutes (negative = before)
 * @returns {string} Human-readable string
 */
export function formatTriggerOffset(offsetMinutes) {
    const absMinutes = Math.abs(offsetMinutes);
    const direction = offsetMinutes < 0 ? 'before' : 'after';

    if (absMinutes === 0) {
        return 'At due time';
    } else if (absMinutes < 60) {
        return `${absMinutes} minute${absMinutes !== 1 ? 's' : ''} ${direction}`;
    } else if (absMinutes < 1440) {
        const hours = Math.floor(absMinutes / 60);
        const mins = absMinutes % 60;
        if (mins === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ${direction}`;
        } else {
            return `${hours}h ${mins}m ${direction}`;
        }
    } else {
        const days = Math.floor(absMinutes / 1440);
        const remainingMins = absMinutes % 1440;
        if (remainingMins === 0) {
            return `${days} day${days !== 1 ? 's' : ''} ${direction}`;
        } else {
            const hours = Math.floor(remainingMins / 60);
            return `${days}d ${hours}h ${direction}`;
        }
    }
}
