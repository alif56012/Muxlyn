import {
  Activity,
  Database,
  FileText,
  GitBranch,
  HardDrive,
  MessageCircle,
  Webhook,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export type ExternalServiceType =
  | 'monitor'
  | 'database'
  | 'cicd'
  | 'docs'
  | 'chat'
  | 'api'
  | 'storage'
  | 'custom';

export interface ServiceTypeDef {
  icon: LucideIcon;
  color: string;
  textColor: string;
  borderColor: string;
  labelKey: string;
}

export const SERVICE_TYPE_DEFS: Record<ExternalServiceType, ServiceTypeDef> = {
  monitor: {
    icon: Activity,
    color: 'bg-green-500',
    textColor: 'text-green-500',
    borderColor: 'border-green-500/30',
    labelKey: 'service.type.monitor',
  },
  database: {
    icon: Database,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500/30',
    labelKey: 'service.type.database',
  },
  cicd: {
    icon: GitBranch,
    color: 'bg-purple-500',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500/30',
    labelKey: 'service.type.cicd',
  },
  docs: {
    icon: FileText,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500/30',
    labelKey: 'service.type.docs',
  },
  chat: {
    icon: MessageCircle,
    color: 'bg-indigo-500',
    textColor: 'text-indigo-500',
    borderColor: 'border-indigo-500/30',
    labelKey: 'service.type.chat',
  },
  api: {
    icon: Webhook,
    color: 'bg-orange-500',
    textColor: 'text-orange-500',
    borderColor: 'border-orange-500/30',
    labelKey: 'service.type.api',
  },
  storage: {
    icon: HardDrive,
    color: 'bg-teal-500',
    textColor: 'text-teal-500',
    borderColor: 'border-teal-500/30',
    labelKey: 'service.type.storage',
  },
  custom: {
    icon: Wrench,
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500/30',
    labelKey: 'service.type.custom',
  },
};

export function getServiceTypeDef(type: string): ServiceTypeDef {
  if (type in SERVICE_TYPE_DEFS) {
    return SERVICE_TYPE_DEFS[type as ExternalServiceType];
  }
  return {
    icon: Wrench,
    color: 'bg-gray-500',
    textColor: 'text-gray-500',
    borderColor: 'border-gray-500/30',
    labelKey: type,
  };
}
