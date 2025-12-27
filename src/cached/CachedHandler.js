import {CachedTaskList} from "./CachedTaskList";

/**
 * Handler for accessing all cached task lists offline
 */
export class CachedHandler {
    constructor(config) {
        this.config = config;
        this.cantListCompleted = false;
    }

    getTaskLists() {
        const cachedLists = this.config.get("cachedLists", []);
        return Promise.resolve(
            cachedLists.map(list => new CachedListWrapper(list, this.config))
        );
    }

    getTaskList(id) {
        const cachedLists = this.config.get("cachedLists", []);
        const listData = cachedLists.find(l => l.id === id);
        if (listData) {
            return new CachedListWrapper(listData, this.config);
        }
        return null;
    }
}

/**
 * Wrapper for a cached task list
 */
class CachedListWrapper {
    constructor(data, config) {
        this.id = data.id;
        this.title = data.title;
        this._tasks = data.tasks || [];
        this.config = config;
    }

    getTasks(withComplete = false, page = null) {
        const tasks = this._tasks.map(taskData =>
            new CachedTaskWrapper(taskData, this, this.config)
        );

        const filtered = withComplete
            ? tasks
            : tasks.filter(t => !t.completed);

        return Promise.resolve({
            tasks: filtered,
            nextPageToken: null
        });
    }

    getTask(id) {
        const taskData = this._tasks.find(t => t.id === id);
        if (taskData) {
            return new CachedTaskWrapper(taskData, this, this.config);
        }
        return null;
    }

    insertTask(title) {
        const log = this.config.get("log", []);
        const cachedLists = this.config.get("cachedLists", []);
        const nextId = this.config.get("next_id", 0);

        const newTask = {
            id: `cached:${nextId}`,
            title: title,
            completed: false,
            important: false,
            checklistItems: []
        };

        // Update cached lists
        const listIndex = cachedLists.findIndex(l => l.id === this.id);
        if (listIndex >= 0) {
            cachedLists[listIndex].tasks.unshift(newTask);
        }

        // Log for sync
        log.push({
            command: "insert_task",
            listId: this.id,
            id: nextId,
            title: title
        });

        this.config.update({
            cachedLists: cachedLists,
            log: log,
            next_id: nextId + 1
        });

        return Promise.resolve(new CachedTaskWrapper(newTask, this, this.config));
    }
}

/**
 * Wrapper for a cached task
 */
class CachedTaskWrapper {
    constructor(data, list, config) {
        this.id = data.id;
        this.title = data.title;
        this.description = data.description || "";
        this.completed = data.completed;
        this.important = data.important || false;
        this.checklistItems = data.checklistItems || [];
        this.uid = data.uid || null;
        this.parentId = data.parentId || null;
        this.priority = data.priority || 0;
        this.status = data.status || "NEEDS-ACTION";
        this.inProgress = data.inProgress || false;
        this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        this.location = data.location || "";
        this.geo = data.geo || null;
        this.subtasks = (data.subtasks || []).map(s => new CachedTaskWrapper(s, list, config));
        this.list = list;
        this.config = config;
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

    /**
     * Get color for priority level (Nextcloud/tasks.org standard)
     * 0 = None (white), 1-4 = High (red), 5 = Medium (yellow), 6-9 = Low (blue)
     */
    getPriorityColor() {
        if (this.priority >= 1 && this.priority <= 4) return 0xFF5555; // High - Red
        if (this.priority === 5) return 0xFFDD00; // Medium - Yellow
        if (this.priority >= 6 && this.priority <= 9) return 0x5599FF; // Low - Blue
        return 0xFFFFFF; // None - White
    }

    _updateTask(updates) {
        const cachedLists = this.config.get("cachedLists", []);
        const listIndex = cachedLists.findIndex(l => l.id === this.list.id);
        if (listIndex >= 0) {
            const taskIndex = cachedLists[listIndex].tasks.findIndex(t => t.id === this.id);
            if (taskIndex >= 0) {
                Object.assign(cachedLists[listIndex].tasks[taskIndex], updates);
                this.config.update({ cachedLists: cachedLists });
            }
        }
    }

    sync() {
        return Promise.resolve();
    }

    setCompleted(value) {
        return this.setStatus(value ? "COMPLETED" : "NEEDS-ACTION");
    }

    setStatus(newStatus) {
        const log = this.config.get("log", []);
        this._updateTask({
            status: newStatus,
            completed: newStatus === "COMPLETED",
            inProgress: newStatus === "IN-PROCESS"
        });
        this.status = newStatus;
        this.completed = newStatus === "COMPLETED";
        this.inProgress = newStatus === "IN-PROCESS";

        log.push({
            command: "set_status",
            listId: this.list.id,
            id: this.id,
            value: newStatus
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }

    cycleStatus() {
        const nextStatus = {
            "NEEDS-ACTION": "IN-PROCESS",
            "IN-PROCESS": "COMPLETED",
            "COMPLETED": "NEEDS-ACTION"
        };
        return this.setStatus(nextStatus[this.status] || "IN-PROCESS");
    }

    setTitle(value) {
        const log = this.config.get("log", []);
        this._updateTask({ title: value });
        this.title = value;

        log.push({
            command: "set_title",
            listId: this.list.id,
            id: this.id,
            value: value
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }

    setDescription(value) {
        const log = this.config.get("log", []);
        this._updateTask({ description: value });
        this.description = value;

        log.push({
            command: "set_description",
            listId: this.list.id,
            id: this.id,
            value: value
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }

    setImportant(value) {
        const log = this.config.get("log", []);
        this._updateTask({ important: value });
        this.important = value;

        log.push({
            command: "set_important",
            listId: this.list.id,
            id: this.id,
            value: value
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }

    setPriority(value) {
        const log = this.config.get("log", []);
        value = parseInt(value, 10) || 0;
        if (value < 0) value = 0;
        if (value > 9) value = 9;

        this._updateTask({ priority: value });
        this.priority = value;

        log.push({
            command: "set_priority",
            listId: this.list.id,
            id: this.id,
            value: value
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }

    setLocation(lat, lon, locationText = "") {
        const log = this.config.get("log", []);

        if (lat !== null && lon !== null) {
            this.geo = { lat, lon };
        } else {
            this.geo = null;
        }
        this.location = locationText || "";

        this._updateTask({ geo: this.geo, location: this.location });

        log.push({
            command: "set_location",
            listId: this.list.id,
            id: this.id,
            lat: lat,
            lon: lon,
            locationText: locationText
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }

    delete() {
        const log = this.config.get("log", []);
        const cachedLists = this.config.get("cachedLists", []);

        const listIndex = cachedLists.findIndex(l => l.id === this.list.id);
        if (listIndex >= 0) {
            cachedLists[listIndex].tasks = cachedLists[listIndex].tasks.filter(
                t => t.id !== this.id
            );
            this.config.update({ cachedLists: cachedLists });
        }

        log.push({
            command: "delete",
            listId: this.list.id,
            id: this.id
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }

    setChecklistItemChecked(itemId, isChecked) {
        const log = this.config.get("log", []);

        // Update local cache
        const item = this.checklistItems.find(i => i.id === itemId);
        if (item) {
            item.isChecked = isChecked;
            this._updateTask({ checklistItems: this.checklistItems });
        }

        log.push({
            command: "set_checklist_checked",
            listId: this.list.id,
            taskId: this.id,
            itemId: itemId,
            value: isChecked
        });
        this.config.update({ log: log });

        return Promise.resolve();
    }
}
