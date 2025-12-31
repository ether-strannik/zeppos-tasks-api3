import hmUI, { setStatusBarVisible } from "@zos/ui";
import { exit } from "@zos/router";
import { Vibrator, VIBRATOR_SCENE_TIMER, VIBRATOR_SCENE_NOTIFICATION } from "@zos/sensor";
import { create, id } from "@zos/media";
import { setWakeUpRelaunch, setPageBrightTime } from '@zos/display';
import { getDeviceInfo } from "@zos/device";
import { parseTaskAlarmParam, cancelTaskAlarms, createSnoozeAlarm } from "../../utils/app-reminder-manager";
import { TimePicker } from "../../lib/mmk/TimePicker";

const { width: DEVICE_WIDTH, height: DEVICE_HEIGHT } = getDeviceInfo();
const { config, t, tasksProvider } = getApp()._options.globalData;

let alarmPlayer = null;
let vibrator = null;
let timePicker = null;
let isProcessing = false; // Guard against multiple button taps

Page({
    onInit(params) {
        // Parse alarm params
        const parsed = parseTaskAlarmParam(params);
        if (!parsed) {
            this.error = true;
            return;
        }

        this.taskUID = parsed.taskUID;
        this.taskTitle = parsed.taskTitle;
        this.taskDescription = parsed.taskDescription || '';
        this.vibrationEnabled = parsed.vibrationEnabled;
        this.vibrationType = parsed.vibrationType;
        this.soundEnabled = parsed.soundEnabled;

        // Load full task by UID
        this.task = this.findTaskByUID(this.taskUID);

        // Keep screen on during alarm (use long bright time for API 4.2)
        try {
            setPageBrightTime({ brightTime: 600000 }); // 10 minutes
            setWakeUpRelaunch({ relaunch: true });
        } catch (e) {
            // Ignore errors
        }

        // Start alerts
        if (this.vibrationEnabled) {
            this.startVibration();
        }
        if (this.soundEnabled) {
            this.startSound();
        }
    },

    /**
     * Find task by UID across all lists
     */
    findTaskByUID(uid) {
        try {
            // Get all task lists
            const lists = tasksProvider.getTaskLists();

            // Handle case where getTaskLists returns non-iterable value
            if (!lists || !Array.isArray(lists) || lists.length === 0) {
                return null;
            }

            // Search each list
            for (let i = 0; i < lists.length; i++) {
                const list = lists[i];
                if (list && typeof list.getTask === 'function') {
                    const task = list.getTask(uid);
                    if (task) {
                        return task;
                    }
                }
            }

            return null;
        } catch (e) {
            return null;
        }
    },

    startVibration() {
        try {
            const vibrationMode = this.vibrationType === 'N' ?
                VIBRATOR_SCENE_NOTIFICATION :
                VIBRATOR_SCENE_TIMER;

            vibrator = new Vibrator();
            vibrator.start();
            vibrator.setMode(vibrationMode);
            vibrator.start();
        } catch (e) {
            // Ignore errors
        }
    },

    startSound() {
        try {
            alarmPlayer = create(id.PLAYER);

            alarmPlayer.addEventListener(alarmPlayer.event.PREPARE, (result) => {
                if (result) {
                    alarmPlayer.start();
                }
            });

            alarmPlayer.addEventListener(alarmPlayer.event.COMPLETE, () => {
                // Loop audio by re-preparing
                alarmPlayer.prepare();
            });

            alarmPlayer.setSource(alarmPlayer.source.FILE, { file: 'task-alarm.mp3' });
            alarmPlayer.prepare();
        } catch (e) {
            // Ignore errors
        }
    },

    build() {
        setStatusBarVisible(false);

        if (this.error) {
            this.showError();
            return;
        }

        // Black background
        hmUI.createWidget(hmUI.widget.FILL_RECT, {
            x: 0,
            y: 0,
            w: DEVICE_WIDTH,
            h: DEVICE_HEIGHT,
            color: 0x000000
        });

        let yPos = DEVICE_HEIGHT / 10;

        // Task title (smaller, moved higher)
        hmUI.createWidget(hmUI.widget.TEXT, {
            x: 20,
            y: yPos,
            w: DEVICE_WIDTH - 40,
            h: 80,
            text: this.taskTitle,
            text_size: 28,
            align_h: hmUI.align.CENTER_H,
            align_v: hmUI.align.CENTER_V,
            color: 0xFFFFFF,
            text_style: hmUI.text_style.WRAP
        });
        yPos += 85;

        // Task notes/description (if available - from alarm param, not task lookup)
        if (this.taskDescription && this.taskDescription.trim()) {
            hmUI.createWidget(hmUI.widget.TEXT, {
                x: 20,
                y: yPos,
                w: DEVICE_WIDTH - 40,
                h: 80,
                text: this.taskDescription,
                text_size: 24,
                align_h: hmUI.align.CENTER_H,
                color: 0xAAAAAA,
                text_style: hmUI.text_style.WRAP
            });
            yPos += 85;
        }

        // Due date (if available)
        if (this.task && this.task.due) {
            const dueText = this.formatDueDate(this.task.due);

            hmUI.createWidget(hmUI.widget.TEXT, {
                x: 20,
                y: yPos,
                w: DEVICE_WIDTH - 40,
                h: 40,
                text: `Due: ${dueText}`,
                text_size: 20,
                align_h: hmUI.align.CENTER_H,
                color: 0x999999
            });
            yPos += 50;
        }

        // Buttons (narrower, positioned lower)
        const buttonY = DEVICE_HEIGHT - 200;
        const buttonX = Math.floor(DEVICE_WIDTH * 0.2);
        const buttonW = Math.floor(DEVICE_WIDTH * 0.6);
        const buttonH = 50;
        const gap = 8;

        // Complete button (green)
        hmUI.createWidget(hmUI.widget.BUTTON, {
            x: buttonX,
            y: buttonY,
            w: buttonW,
            h: buttonH,
            radius: 25,
            normal_color: 0x00AA00,
            press_color: 0x008800,
            text: t('Complete'),
            text_size: 22,
            click_func: () => this.completeTask()
        });

        // Snooze button (orange)
        hmUI.createWidget(hmUI.widget.BUTTON, {
            x: buttonX,
            y: buttonY + buttonH + gap,
            w: buttonW,
            h: buttonH,
            radius: 25,
            normal_color: 0xFFAA00,
            press_color: 0xDD8800,
            text: t('Snooze'),
            text_size: 22,
            click_func: () => this.snooze()
        });

        // Dismiss button (red)
        hmUI.createWidget(hmUI.widget.BUTTON, {
            x: buttonX,
            y: buttonY + (buttonH + gap) * 2,
            w: buttonW,
            h: buttonH,
            radius: 25,
            normal_color: 0xFF0000,
            press_color: 0xCC0000,
            text: t('Dismiss'),
            text_size: 22,
            click_func: () => this.dismiss()
        });
    },

    showError() {
        hmUI.createWidget(hmUI.widget.FILL_RECT, {
            x: 0,
            y: 0,
            w: DEVICE_WIDTH,
            h: DEVICE_HEIGHT,
            color: 0x000000
        });

        hmUI.createWidget(hmUI.widget.TEXT, {
            x: 20,
            y: DEVICE_HEIGHT / 2 - 40,
            w: DEVICE_WIDTH - 40,
            h: 80,
            text: 'Error loading task reminder',
            text_size: 28,
            align_h: hmUI.align.CENTER_H,
            align_v: hmUI.align.CENTER_V,
            color: 0xFF0000
        });

        hmUI.createWidget(hmUI.widget.BUTTON, {
            x: 40,
            y: DEVICE_HEIGHT / 2 + 60,
            w: DEVICE_WIDTH - 80,
            h: 60,
            radius: 30,
            normal_color: 0xFF0000,
            press_color: 0xCC0000,
            text: t('Close'),
            text_size: 24,
            click_func: () => exit()
        });
    },

    formatDueDate(dueDate) {
        const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;

        if (dueDay.getTime() === today.getTime()) {
            return `Today at ${timeStr}`;
        } else if (dueDay.getTime() === today.getTime() + 86400000) {
            return `Tomorrow at ${timeStr}`;
        } else if (dueDay.getTime() === today.getTime() - 86400000) {
            return `Yesterday at ${timeStr}`;
        } else {
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${month}/${day} at ${timeStr}`;
        }
    },

    completeTask() {
        if (isProcessing) return;
        isProcessing = true;
        this.stopAlerts();

        if (!this.task) {
            hmUI.showToast({ text: t('Error: Task not found') });
            exit();
            return;
        }

        try {
            // Mark task completed
            this.task.setCompleted(true);

            // Cancel all alarms for this task
            cancelTaskAlarms(this.taskUID);

            hmUI.showToast({ text: t('Task completed') });
        } catch (e) {
            hmUI.showToast({ text: t('Error completing task') });
        }

        exit();
    },

    snooze() {
        if (isProcessing) return;

        // Stop alerts while picking duration
        this.stopAlerts();

        // Get default snooze duration from settings
        const snoozeDurations = [1, 5, 10, 15, 30, 60];
        const snoozeIndex = config.get("snooze_duration_index", 2); // default index 2 = 10 min
        const defaultMinutes = snoozeDurations[snoozeIndex] || 10;
        const defaultHour = Math.floor(defaultMinutes / 60);
        const defaultMin = defaultMinutes % 60;

        // Store selected duration
        this.snoozeHour = defaultHour;
        this.snoozeMinute = defaultMin;

        // Show TimePicker overlay
        timePicker = new TimePicker({
            initialHour: defaultHour,
            initialMinute: defaultMin,
            onSelect: (hour, minute) => {
                this.snoozeHour = hour;
                this.snoozeMinute = minute;
            },
            onConfirm: () => {
                this.createSnoozeAlarm();
            }
        });

        timePicker.render();
    },

    createSnoozeAlarm() {
        if (isProcessing) return;
        isProcessing = true;

        const totalMinutes = (this.snoozeHour * 60) + this.snoozeMinute;

        if (totalMinutes === 0) {
            hmUI.showToast({ text: t('Please select a duration') });
            isProcessing = false;
            return;
        }

        // Create snooze alarm with same settings as original
        const settings = {
            vibrationEnabled: this.vibrationEnabled,
            vibrationType: this.vibrationType,
            soundEnabled: this.soundEnabled
        };

        const alarmId = createSnoozeAlarm(
            this.taskUID,
            this.taskTitle,
            this.taskDescription,
            totalMinutes,
            settings
        );

        if (alarmId) {
            const hoursText = this.snoozeHour > 0 ? `${this.snoozeHour}h ` : '';
            const minutesText = this.snoozeMinute > 0 ? `${this.snoozeMinute}m` : '';
            hmUI.showToast({ text: t(`Snoozed for ${hoursText}${minutesText}`) });
        } else {
            hmUI.showToast({ text: t('Failed to snooze') });
        }

        // Destroy picker and exit
        if (timePicker) {
            timePicker.destroy();
            timePicker = null;
        }
        exit();
    },

    dismiss() {
        if (isProcessing) return;
        isProcessing = true;
        this.stopAlerts();
        exit();
    },

    stopAlerts() {
        if (vibrator) {
            try {
                vibrator.stop();
            } catch (e) {
                // Ignore errors
            }
        }

        if (alarmPlayer) {
            try {
                alarmPlayer.stop();
            } catch (e) {
                // Ignore errors
            }
        }
    },

    onDestroy() {
        // Reset module-level guard for next use
        isProcessing = false;

        // Clean up TimePicker if shown
        if (timePicker) {
            try {
                timePicker.destroy();
                timePicker = null;
            } catch (e) {
                // Ignore errors
            }
        }

        // Reset screen brightness to default (API 4.2)
        try {
            setPageBrightTime({ brightTime: 15000 }); // Reset to 15 seconds
        } catch (e) {
            // Ignore errors
        }

        this.stopAlerts();
    }
});
