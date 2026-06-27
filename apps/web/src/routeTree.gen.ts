/* eslint-disable */
// @ts-nocheck
// Generated route tree — follows TanStack Router format

import { Route as rootRouteImport } from './routes/__root';
import { Route as IndexRouteImport } from './routes/index';
import { Route as LoginRouteImport } from './routes/login';
import { Route as LoginCallbackRouteImport } from './routes/login.callback';
import { Route as ForgotPasswordRouteImport } from './routes/forgot-password';
import { Route as ResetPasswordRouteImport } from './routes/reset-password';
import { Route as AuthedRouteImport } from './routes/_authed';
import { Route as AuthedHubRouteImport } from './routes/_authed.hub';
import { Route as AuthedSettingsRouteImport } from './routes/_authed.settings';
import { Route as AuthedJiraRouteImport } from './routes/_authed.jira';
import { Route as AuthedWorklogRouteImport } from './routes/_authed.worklog';
import { Route as AuthedWorklogHistoryRouteImport } from './routes/_authed.worklog.history';

const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any);
const LoginRoute = LoginRouteImport.update({ id: '/login', path: '/login', getParentRoute: () => rootRouteImport } as any);
const LoginCallbackRoute = LoginCallbackRouteImport.update({ id: '/login/callback', path: '/login/callback', getParentRoute: () => rootRouteImport } as any);
const ForgotPasswordRoute = ForgotPasswordRouteImport.update({ id: '/forgot-password', path: '/forgot-password', getParentRoute: () => rootRouteImport } as any);
const ResetPasswordRoute = ResetPasswordRouteImport.update({ id: '/reset-password', path: '/reset-password', getParentRoute: () => rootRouteImport } as any);
const AuthedRoute = AuthedRouteImport.update({ id: '/_authed', getParentRoute: () => rootRouteImport } as any);
const AuthedHubRoute = AuthedHubRouteImport.update({ id: '/_authed/hub', path: '/hub', getParentRoute: () => AuthedRoute } as any);
const AuthedSettingsRoute = AuthedSettingsRouteImport.update({ id: '/_authed/settings', path: '/settings', getParentRoute: () => AuthedRoute } as any);
const AuthedJiraRoute = AuthedJiraRouteImport.update({ id: '/_authed/jira', path: '/jira', getParentRoute: () => AuthedRoute } as any);
const AuthedWorklogRoute = AuthedWorklogRouteImport.update({ id: '/_authed/worklog', path: '/worklog', getParentRoute: () => AuthedRoute } as any);
const AuthedWorklogHistoryRoute = AuthedWorklogHistoryRouteImport.update({ id: '/_authed/worklog/history', path: '/worklog/history', getParentRoute: () => AuthedWorklogRoute } as any);

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute;
  '/login': typeof LoginRoute;
  '/login/callback': typeof LoginCallbackRoute;
  '/forgot-password': typeof ForgotPasswordRoute;
  '/reset-password': typeof ResetPasswordRoute;
  '/hub': typeof AuthedHubRoute;
  '/settings': typeof AuthedSettingsRoute;
  '/jira': typeof AuthedJiraRoute;
  '/worklog': typeof AuthedWorklogRoute;
  '/worklog/history': typeof AuthedWorklogHistoryRoute;
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute;
  '/login': typeof LoginRoute;
  '/login/callback': typeof LoginCallbackRoute;
  '/forgot-password': typeof ForgotPasswordRoute;
  '/reset-password': typeof ResetPasswordRoute;
  '/hub': typeof AuthedHubRoute;
  '/settings': typeof AuthedSettingsRoute;
  '/jira': typeof AuthedJiraRoute;
  '/worklog': typeof AuthedWorklogRoute;
  '/worklog/history': typeof AuthedWorklogHistoryRoute;
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport;
  '/': typeof IndexRoute;
  '/login': typeof LoginRoute;
  '/login/callback': typeof LoginCallbackRoute;
  '/forgot-password': typeof ForgotPasswordRoute;
  '/reset-password': typeof ResetPasswordRoute;
  '/_authed': typeof AuthedRouteWithChildren;
  '/_authed/hub': typeof AuthedHubRoute;
  '/_authed/settings': typeof AuthedSettingsRoute;
  '/_authed/jira': typeof AuthedJiraRoute;
  '/_authed/worklog': typeof AuthedWorklogRouteWithChildren;
  '/_authed/worklog/history': typeof AuthedWorklogHistoryRoute;
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath;
  fullPaths: '/' | '/login' | '/login/callback' | '/forgot-password' | '/reset-password' | '/hub' | '/settings' | '/jira' | '/worklog' | '/worklog/history';
  fileRoutesByTo: FileRoutesByTo;
  to: '/' | '/login' | '/login/callback' | '/forgot-password' | '/reset-password' | '/hub' | '/settings' | '/jira' | '/worklog' | '/worklog/history';
  id: '__root__' | '/' | '/login' | '/login/callback' | '/forgot-password' | '/reset-password' | '/_authed' | '/_authed/hub' | '/_authed/settings' | '/_authed/jira' | '/_authed/worklog' | '/_authed/worklog/history';
  fileRoutesById: FileRoutesById;
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': { id: '/'; path: '/'; fullPath: '/'; preLoaderRoute: typeof IndexRouteImport; parentRoute: typeof rootRouteImport; };
    '/login': { id: '/login'; path: '/login'; fullPath: '/login'; preLoaderRoute: typeof LoginRouteImport; parentRoute: typeof rootRouteImport; };
    '/login/callback': { id: '/login/callback'; path: '/login/callback'; fullPath: '/login/callback'; preLoaderRoute: typeof LoginCallbackRouteImport; parentRoute: typeof rootRouteImport; };
    '/forgot-password': { id: '/forgot-password'; path: '/forgot-password'; fullPath: '/forgot-password'; preLoaderRoute: typeof ForgotPasswordRouteImport; parentRoute: typeof rootRouteImport; };
    '/reset-password': { id: '/reset-password'; path: '/reset-password'; fullPath: '/reset-password'; preLoaderRoute: typeof ResetPasswordRouteImport; parentRoute: typeof rootRouteImport; };
    '/_authed': { id: '/_authed'; path: ''; fullPath: '/'; preLoaderRoute: typeof AuthedRouteImport; parentRoute: typeof rootRouteImport; };
    '/_authed/hub': { id: '/_authed/hub'; path: '/hub'; fullPath: '/hub'; preLoaderRoute: typeof AuthedHubRouteImport; parentRoute: typeof AuthedRoute; };
    '/_authed/settings': { id: '/_authed/settings'; path: '/settings'; fullPath: '/settings'; preLoaderRoute: typeof AuthedSettingsRouteImport; parentRoute: typeof AuthedRoute; };
    '/_authed/jira': { id: '/_authed/jira'; path: '/jira'; fullPath: '/jira'; preLoaderRoute: typeof AuthedJiraRouteImport; parentRoute: typeof AuthedRoute; };
    '/_authed/worklog': { id: '/_authed/worklog'; path: '/worklog'; fullPath: '/worklog'; preLoaderRoute: typeof AuthedWorklogRouteImport; parentRoute: typeof AuthedRoute; };
    '/_authed/worklog/history': { id: '/_authed/worklog/history'; path: '/worklog/history'; fullPath: '/worklog/history'; preLoaderRoute: typeof AuthedWorklogHistoryRouteImport; parentRoute: typeof AuthedWorklogRoute; };
  }
}

interface WorklogRouteChildren {
  AuthedWorklogHistoryRoute: typeof AuthedWorklogHistoryRoute;
}
const WorklogRouteChildren: WorklogRouteChildren = { AuthedWorklogHistoryRoute };
const AuthedWorklogRouteWithChildren = AuthedWorklogRoute._addFileChildren(WorklogRouteChildren);

interface AuthedRouteChildren {
  AuthedHubRoute: typeof AuthedHubRoute;
  AuthedSettingsRoute: typeof AuthedSettingsRoute;
  AuthedJiraRoute: typeof AuthedJiraRoute;
  AuthedWorklogRoute: typeof AuthedWorklogRouteWithChildren;
}
const AuthedRouteChildren: AuthedRouteChildren = {
  AuthedHubRoute,
  AuthedSettingsRoute,
  AuthedJiraRoute,
  AuthedWorklogRoute: AuthedWorklogRouteWithChildren,
};
const AuthedRouteWithChildren = AuthedRoute._addFileChildren(AuthedRouteChildren);

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute;
  LoginRoute: typeof LoginRoute;
  LoginCallbackRoute: typeof LoginCallbackRoute;
  ForgotPasswordRoute: typeof ForgotPasswordRoute;
  ResetPasswordRoute: typeof ResetPasswordRoute;
  AuthedRoute: typeof AuthedRouteWithChildren;
}
const rootRouteChildren: RootRouteChildren = {
  IndexRoute,
  LoginRoute,
  LoginCallbackRoute,
  ForgotPasswordRoute,
  ResetPasswordRoute,
  AuthedRoute: AuthedRouteWithChildren,
};

export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>();
