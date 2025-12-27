export class CachedTask {
    constructor(data, config, withLog) {
        this.id = data.id;
        this.title = data.title;
        this.completed = data.completed;
        this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        this.location = data.location || "";
        this.geo = data.geo || null;
        this.categories = data.categories || [];
        // Alarm can be: null, {type: 'relative', minutes: N}, or {type: 'absolute', date: Date}
        this.alarm = this._parseAlarm(data.alarm);

        this.config = config;
        this.withLog = withLog;
    }

    /**
     * Parse alarm from stored data (handles Date serialization)
     */
    _parseAlarm(alarm) {
        if (alarm === null || alarm === undefined) return null;
        // Handle legacy number format
        if (typeof alarm === 'number') {
            return { type: 'relative', minutes: alarm };
        }
        // Handle object format
        if (typeof alarm === 'object') {
            if (alarm.type === 'absolute' && alarm.date) {
                // Restore Date from timestamp or string
                return { type: 'absolute', date: new Date(alarm.date) };
            }
            return alarm;
        }
        return null;
    }

    /**
     * Serialize alarm for storage
     */
    _serializeAlarm(alarm) {
        if (alarm === null) return null;
        if (alarm.type === 'absolute') {
            // Store date as timestamp for JSON serialization
            return { type: 'absolute', date: alarm.date.getTime() };
        }
        return alarm;
    }

    /**
     * Get time until due date (e.g., "3.5h", "2d", "-1d" for overdue)
     * Returns null if no due date
     */
    getReminderCountdown() {
        if (!this.dueDate) return null;

        const diff = this.dueDate.getTime() - Date.now();
        const hours = diff / (1000 * 60 * 60);

        if (Math.abs(hours) < 24) {
            const h = hours.toFixed(1);
            return `${h}h`;
        } else {
            const days = Math.round(hours / 24);
            return `${days}d`;
        }
    }

    _getSelfIndex(tasks) {
        for(const i in tasks) {
            if(tasks[i].id === this.id)
                return i;
        }
        return null;
    }

    sync() {
        return Promise.resolve();
    }

    setCompleted(value) {
        const tasks = this.config.get("tasks");
        const log = this.config.get("log", []);

        const i = this._getSelfIndex(tasks);
        tasks[i].completed = value;

        if(this.withLog) 
            log.push({command: "set_completed", id: this.id, value});

        this.config.update({tasks, log});
        this.completed = value;
        return Promise.resolve();
    }

    setTitle(value) {
        const tasks = this.config.get("tasks");
        const log = this.config.get("log", []);

        const i = this._getSelfIndex(tasks);
        tasks[i].title = value;

        if(this.withLog) 
            log.push({command: "set_title", id: this.id, value});

        this.config.update({tasks, log});
        this.title = value;
        return Promise.resolve();
    }

    setCategories(value) {
        const tasks = this.config.get("tasks");
        const log = this.config.get("log", []);

        const i = this._getSelfIndex(tasks);
        tasks[i].categories = value || [];

        if(this.withLog)
            log.push({command: "set_categories", id: this.id, value});

        this.config.update({tasks, log});
        this.categories = value || [];
        return Promise.resolve();
    }

    setAlarm(minutes) {
        const tasks = this.config.get("tasks");
        const log = this.config.get("log", []);

        const i = this._getSelfIndex(tasks);
        const alarmValue = minutes !== null ? { type: 'relative', minutes: minutes } : null;
        tasks[i].alarm = this._serializeAlarm(alarmValue);

        if(this.withLog)
            log.push({command: "set_alarm", id: this.id, value: alarmValue});

        this.config.update({tasks, log});
        this.alarm = alarmValue;
        return Promise.resolve();
    }

    setAlarmAbsolute(date) {
        const tasks = this.config.get("tasks");
        const log = this.config.get("log", []);

        const i = this._getSelfIndex(tasks);
        const alarmValue = date !== null ? { type: 'absolute', date: date } : null;
        tasks[i].alarm = this._serializeAlarm(alarmValue);

        if(this.withLog)
            log.push({command: "set_alarm_absolute", id: this.id, value: alarmValue});

        this.config.update({tasks, log});
        this.alarm = alarmValue;
        return Promise.resolve();
    }

    /**
     * Format alarm to human-readable string
     */
    formatAlarm() {
        if (this.alarm === null) return null;

        // Handle object format
        if (typeof this.alarm === 'object') {
            if (this.alarm.type === 'relative') {
                const minutes = this.alarm.minutes;
                if (minutes === 0) return "At time";
                if (minutes < 60) return minutes + " min before";
                if (minutes < 24 * 60) {
                    const hours = minutes / 60;
                    return hours === 1 ? "1 hour before" : hours + " hours before";
                }
                const days = minutes / (24 * 60);
                return days === 1 ? "1 day before" : days + " days before";
            } else if (this.alarm.type === 'absolute') {
                const date = this.alarm.date;
                const now = Date.now();
                const diff = date.getTime() - now;

                if (diff < 0) return "Passed";

                const hours = diff / (1000 * 60 * 60);
                if (hours < 24) {
                    if (hours < 1) {
                        const mins = Math.round(diff / (1000 * 60));
                        return "In " + mins + " min";
                    }
                    return "In " + hours.toFixed(1) + "h";
                }

                const pad = (n) => n.toString().padStart(2, '0');
                const month = date.getMonth() + 1;
                const day = date.getDate();
                const hour = date.getHours();
                const minute = date.getMinutes();
                return pad(month) + "/" + pad(day) + " " + pad(hour) + ":" + pad(minute);
            }
        }

        // Legacy number format
        if (typeof this.alarm === 'number') {
            if (this.alarm === 0) return "At time";
            if (this.alarm < 60) return this.alarm + " min before";
            if (this.alarm < 24 * 60) {
                const hours = this.alarm / 60;
                return hours === 1 ? "1 hour before" : hours + " hours before";
            }
            const days = this.alarm / (24 * 60);
            return days === 1 ? "1 day before" : days + " days before";
        }

        return null;
    }

    delete() {
        const log = this.config.get("log", []);
        let tasks = this.config.get("tasks");

        tasks = tasks.filter((item) => item.id !== this.id);

        if(this.withLog)
            log.push({command: "delete", id: this.id});

        this.config.update({tasks, log});
        return Promise.resolve();
    }
}
