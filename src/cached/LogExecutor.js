export class LogExecutor {
    constructor(log, taskList, handler = null) {
        this.log = log;
        this.taskList = taskList;
        this.handler = handler; // For multi-list support
        this.idOverride = {};
    }

    _getTaskList(record) {
        // Use listId from record if handler available, otherwise use default taskList
        if (record.listId && this.handler) {
            return this.handler.getTaskList(record.listId);
        }
        return this.taskList;
    }

    start() {
        if(this.log.length === 0) return Promise.resolve();

        const record = this.log.shift();
        switch(record.command) {
            case "insert_task":
                return this._log_insert_task(record);
            case "set_completed":
                return this._log_set_completed(record);
            case "set_status":
                return this._log_set_status(record);
            case "set_title":
                return this._log_set_title(record);
            case "set_description":
                return this._log_set_description(record);
            case "set_important":
                return this._log_set_important(record);
            case "set_priority":
                return this._log_set_priority(record);
            case "set_alarm":
                return this._log_set_alarm(record);
            case "set_alarm_absolute":
                return this._log_set_alarm_absolute(record);
            case "set_categories":
                return this._log_set_categories(record);
            case "set_location":
                return this._log_set_location(record);
            case "set_checklist_checked":
                return this._log_set_checklist_checked(record);
            case "delete":
                return this._log_delete(record);
            default:
                console.log(`WARN: Unprocessable command: ${record.command}`);
                return this.start();
        }
    }

    _log_insert_task(record) {
        const {id, title} = record;
        const taskList = this._getTaskList(record);
        console.log(`LOG_EXEC: Will create task "${title}", virtual_id=cached:${id}`);

        return taskList.insertTask(title).then((d) => {
            console.log(`LOG_EXEC: Map cached:${id} -> ${d.id}`);
            this.idOverride[`cached:${id}`] = d.id;
            return this.start();
        })
    }

    _log_set_completed(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} to completed=${value}`);
        return taskList.getTask(id).setCompleted(value).then(() => {
            return this.start();
        }).catch((e) => {
            console.log(e);
            return this.start();
        });
    }

    _log_set_status(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} to status=${value}`);
        const task = taskList.getTask(id);
        if (task && typeof task.setStatus === 'function') {
            return task.setStatus(value).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        // Fallback to setCompleted for providers without setStatus
        return task.setCompleted(value === "COMPLETED").then(() => {
            return this.start();
        }).catch((e) => {
            console.log(e);
            return this.start();
        });
    }

    _log_set_title(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} to title=${value}`);
        return taskList.getTask(id).setTitle(value).then(() => {
            return this.start();
        }).catch((e) => {
            console.log(e);
            return this.start();
        });
    }

    _log_set_description(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} description`);
        const task = taskList.getTask(id);
        if (task && typeof task.setDescription === 'function') {
            return task.setDescription(value).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_set_important(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} to important=${value}`);
        const task = taskList.getTask(id);
        if (task && typeof task.setImportant === 'function') {
            return task.setImportant(value).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_set_priority(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} to priority=${value}`);
        const task = taskList.getTask(id);
        if (task && typeof task.setPriority === 'function') {
            return task.setPriority(value).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_set_alarm(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        // Extract minutes from value object or use directly
        const minutes = value && typeof value === 'object' ? value.minutes : value;
        console.log(`LOG_EXEC: Will set task ${id} alarm to ${minutes} minutes`);
        const task = taskList.getTask(id);
        if (task && typeof task.setAlarm === 'function') {
            return task.setAlarm(minutes).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_set_alarm_absolute(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        // Extract date from value object
        const date = value && typeof value === 'object' && value.date ? new Date(value.date) : null;
        console.log(`LOG_EXEC: Will set task ${id} absolute alarm to ${date}`);
        const task = taskList.getTask(id);
        if (task && typeof task.setAlarmAbsolute === 'function') {
            return task.setAlarmAbsolute(date).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_set_categories(record) {
        let {id, value} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} categories to ${value}`);
        const task = taskList.getTask(id);
        if (task && typeof task.setCategories === 'function') {
            return task.setCategories(value).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_set_location(record) {
        let {id, lat, lon, locationText} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set task ${id} location to ${lat},${lon}`);
        const task = taskList.getTask(id);
        if (task && typeof task.setLocation === 'function') {
            return task.setLocation(lat, lon, locationText).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_set_checklist_checked(record) {
        let {taskId, itemId, value} = record;
        if(this.idOverride[taskId]) taskId = this.idOverride[taskId];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will set checklist item ${itemId} on task ${taskId} to checked=${value}`);
        const task = taskList.getTask(taskId);
        if (task && typeof task.setChecklistItemChecked === 'function') {
            return task.setChecklistItemChecked(itemId, value).then(() => {
                return this.start();
            }).catch((e) => {
                console.log(e);
                return this.start();
            });
        }
        return this.start();
    }

    _log_delete(record) {
        let {id} = record;
        if(this.idOverride[id]) id = this.idOverride[id];
        const taskList = this._getTaskList(record);

        console.log(`LOG_EXEC: Will delete task ${id}`);
        return taskList.getTask(id).delete().then(() => {
            return this.start();
        }).catch((e) => {
            console.log(e);
            return this.start();
        });
    }
}
