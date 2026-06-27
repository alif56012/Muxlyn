import mitt from "mitt";

type HubEvents = {
  "worklog:created": {
    worklogId: string;
    taskKey: string;
    date: string;
    hours: number;
  };
  "worklog:updated": {
    worklogId: string;
    taskKey: string;
    date: string;
    hours: number;
    changes: Record<string, unknown>;
  };
  "worklog:deleted": {
    worklogId: string;
    taskKey: string;
    date: string;
  };
  "account:switched": {
    accountId: string;
    jiraUrl: string;
  };
};

export const eventBus = mitt<HubEvents & Record<string, unknown>>();
