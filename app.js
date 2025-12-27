import {log} from "@zos/utils";
import {LocalStorage} from "@zos/storage";
import {MessageBuilder} from './lib/zeppos/message'
import {ConfigStorage} from "./lib/mmk/ConfigStorage";
import {prepareFetch} from './lib/mmk/FetchForward';
import {t} from "./lib/mmk/i18n";
import {FsTools} from "./lib/mmk/Path";
import {TasksProvider} from "./src/TasksProvider";

const logger = log.getLogger("app");

const appId = 1023438;
FsTools.appTags = [appId, "app"];

const messageBuilder = new MessageBuilder({ appId });
const config = new ConfigStorage();
const tasksProvider = new TasksProvider(config, messageBuilder);

App({
  globalData: {
    appTags: [appId, "app"],
    messageBuilder,
    config,
    tasksProvider,
    localStorage: null,
    t,
  },

  onCreate(options) {
    logger.log("app.onCreate()");

    this.globalData.localStorage = new LocalStorage();
    prepareFetch(messageBuilder);

    this.globalData.messageBuilder.connect();
    this.globalData.config.load();
  },

  onDestroy(options) {
    logger.log("app.onDestroy()");
    this.globalData.messageBuilder.disConnect();
  }
})
