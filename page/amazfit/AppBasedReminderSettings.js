import hmUI, { setStatusBarVisible, updateStatusBarTitle } from "@zos/ui";
import { push, back } from "@zos/router";
import { ListScreen } from "../../lib/mmk/ListScreen";
import { createTaskAlarms, cancelTaskAlarms, getAppReminderSettings, setAppReminderSettings, getNextScheduledAlarmTime } from "../../utils/app-reminder-manager";
import { hasValidVALARM } from "../../utils/valarm-parser";

const { config, t, tasksProvider } = getApp()._options.globalData;

class AppBasedReminderSettings extends ListScreen {
    constructor(params) {
        super();

        // Handle undefined params gracefully
        if (params === undefined || params === "undefined" || !params) {
            const savedParams = config.get("_appReminderSettingsParams");
            if (savedParams) {
                params = savedParams;
                config.set("_appReminderSettingsParams", null); // Clear after use
            } else {
                params = {};
            }
        } else {
            try {
                params = JSON.parse(params);
            } catch(e) {
                params = {};
            }
        }

        this.listId = params.list_id;
        this.taskId = params.task_id;

        // Use task_data passed from TaskEditScreen
        if (params.task_data) {
            const td = params.task_data;
            this.task = {
                uid: td.uid,
                title: td.title,
                description: td.description || '',
                dueDate: td.dueDate ? new Date(td.dueDate) : null,
                alarm: td.alarm,
                valarm: td.valarm
            };
        } else {
            this.task = null;
        }

        if (!this.task || !this.task.uid) {
            this.task = null;
            return;
        }

        // Load existing settings or defaults
        const existing = getAppReminderSettings(this.task.uid);
        this.settings = existing || {
            enabled: false,
            vibrationEnabled: true,
            vibrationType: 'C',  // Continuous
            soundEnabled: true,
            alarmIds: []
        };

        this.rows = {};
    }

    build() {
        if (!this.task) {
            this.headline(t("Error"));
            this.text({
                text: t("Task not found"),
                color: 0xFF0000
            });
            return;
        }

        this.headline(t("App-Based Reminders"));

        // Check if task has VALARM
        if (!hasValidVALARM(this.task)) {
            this.offset(16);

            // Determine what's missing
            const dueDate = this.task.dueDate || this.task.due;
            let errorMsg;

            if (!dueDate) {
                errorMsg = t("App-based reminders require a due date. Please set a due date first, then configure your reminder relative to that due date (e.g., 'At due time', '15 minutes before', etc.).");
            } else if ((!this.task.valarm || this.task.valarm.length === 0) && (this.task.alarm === null || this.task.alarm === undefined)) {
                errorMsg = t("This task has no reminder set. Please set a reminder first using 'Set reminder' in the task editor.");
            } else {
                errorMsg = t("Unable to configure app-based reminders for this task.");
            }

            this.text({
                text: errorMsg,
                color: 0xFFAA00,
                align_h: hmUI.align.LEFT
            });
            this.offset(16);
            this.row({
                text: t("Back"),
                icon: "icon_s/back.png",
                callback: () => back()
            });
            return;
        }

        // Show current scheduled time if any
        const nextAlarmTime = getNextScheduledAlarmTime(this.task.uid);
        if (nextAlarmTime) {
            const month = (nextAlarmTime.getMonth() + 1).toString().padStart(2, '0');
            const day = nextAlarmTime.getDate().toString().padStart(2, '0');
            const hours = nextAlarmTime.getHours().toString().padStart(2, '0');
            const minutes = nextAlarmTime.getMinutes().toString().padStart(2, '0');
            this.text({
                text: t("Scheduled: ") + `${month}/${day}, ${hours}:${minutes}`,
                color: 0x00FF00
            });
            this.offset(8);
            // Cancel alarms option
            this.row({
                text: t("Cancel scheduled alarm"),
                icon: "icon_s/delete.png",
                callback: () => this.cancelAlarms()
            });
        }

        // Vibration section
        this.offset(16);
        this.headline(t("Vibration"));

        // Vibration toggle
        this.rows.vibration = this.row({
            text: this.settings.vibrationEnabled ? t("ON") : t("OFF"),
            icon: `icon_s/cb_${this.settings.vibrationEnabled}.png`,
            callback: () => this.toggleVibration()
        });

        // Vibration type
        const vibrationType = this.settings.vibrationType === 'C' ? t("Continuous") : t("Non-continuous");
        this.rows.vibrationType = this.row({
            text: t("Type: ") + vibrationType,
            icon: "icon_s/vibration.png",
            callback: () => this.toggleVibrationType()
        });

        // Sound section
        this.offset(16);
        this.headline(t("Sound"));

        // Sound toggle
        this.rows.sound = this.row({
            text: this.settings.soundEnabled ? t("ON") : t("OFF"),
            icon: `icon_s/cb_${this.settings.soundEnabled}.png`,
            callback: () => this.toggleSound()
        });

        // Snooze section (global setting)
        this.offset(16);
        this.headline(t("Snooze"));

        // Snooze duration picker
        const snoozeDurations = [1, 5, 10, 15, 30, 60];
        const savedSnoozeIndex = config.get("snooze_duration_index", 2); // default 10 min
        this.snoozeIndex = savedSnoozeIndex;
        const snoozeText = this.formatSnoozeDuration(snoozeDurations[this.snoozeIndex]);

        this.rows.snooze = this.row({
            text: snoozeText,
            icon: "icon_s/alarm.png",
            callback: () => this.cycleSnoozeDuration()
        });

        // Schedule button
        this.offset(32);
        this.row({
            text: t("Schedule reminder"),
            icon: "icon_s/save.png",
            callback: () => this.save()
        });

        this.offset();
    }

    cancelAlarms() {
        cancelTaskAlarms(this.task.uid);
        this.settings.alarmIds = [];
        this.settings.nextTriggerTime = null;
        setAppReminderSettings(this.task.uid, this.settings);
        hmUI.showToast({ text: t("Alarm cancelled") });
        back();
    }

    toggleVibration() {
        this.settings.vibrationEnabled = !this.settings.vibrationEnabled;
        const text = this.settings.vibrationEnabled ? t("ON") : t("OFF");
        this.rows.vibration.textView.setProperty(hmUI.prop.TEXT, text);
        this.rows.vibration.iconView.setProperty(hmUI.prop.SRC, `icon_s/cb_${this.settings.vibrationEnabled}.png`);
    }

    toggleVibrationType() {
        this.settings.vibrationType = this.settings.vibrationType === 'C' ? 'N' : 'C';
        const typeText = this.settings.vibrationType === 'C' ? t("Continuous") : t("Non-continuous");
        this.rows.vibrationType.textView.setProperty(hmUI.prop.TEXT, t("Type: ") + typeText);
    }

    toggleSound() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        const text = this.settings.soundEnabled ? t("ON") : t("OFF");
        this.rows.sound.textView.setProperty(hmUI.prop.TEXT, text);
        this.rows.sound.iconView.setProperty(hmUI.prop.SRC, `icon_s/cb_${this.settings.soundEnabled}.png`);
    }

    formatSnoozeDuration(minutes) {
        if (minutes >= 60) {
            return `${minutes / 60} ${t("hour")}`;
        }
        return `${minutes} ${t("min")}`;
    }

    cycleSnoozeDuration() {
        const snoozeDurations = [1, 5, 10, 15, 30, 60];
        this.snoozeIndex = (this.snoozeIndex + 1) % snoozeDurations.length;
        const snoozeText = this.formatSnoozeDuration(snoozeDurations[this.snoozeIndex]);
        this.rows.snooze.textView.setProperty(hmUI.prop.TEXT, snoozeText);
    }

    save() {
        // Save snooze duration (global setting)
        if (this.snoozeIndex !== undefined) {
            config.set("snooze_duration_index", this.snoozeIndex);
        }

        // Cancel existing alarms first
        cancelTaskAlarms(this.task.uid);

        // Save settings first (vibration, sound, etc)
        setAppReminderSettings(this.task.uid, this.settings);

        // Create new alarms - this will add alarmIds and nextTriggerTime to config
        const alarmIds = createTaskAlarms(this.task, this.settings);

        if (alarmIds.length === 0) {
            hmUI.showToast({ text: t("Failed to schedule") });
            return;
        }

        hmUI.showToast({ text: t("Reminder scheduled") });

        // Navigate back
        back();
    }
}

Page({
    onInit(params) {
        setStatusBarVisible(true);
        updateStatusBarTitle("");
        new AppBasedReminderSettings(params).build();
    }
});
