export type Patch = Record<string, number>;
export interface Device {
  mac: string; ip: string; name: string; room: string; model?: string; firmware?: string; encryption?: string;
  online: boolean; state: Patch; lastSeen?: number; error?: string; pending?: boolean; pausedUntil?: number;
  features: string[]; poweredSince?: number; externalOverride?: ExternalOverride; maintenance?: Maintenance; favorite?: boolean; comfort?: ComfortSummary;
}
export interface Group { id: string; name: string; members: string[]; favorite?:boolean }
export type Target = { kind: 'device' | 'group'; id: string };
export type Field = 'ambient' | 'Pow' | 'Mod' | 'SetTem' | 'WdSpd' | 'onMinutes';
export type Operator = 'gt' | 'lt' | 'eq';
export interface Condition { field: Field; op: Operator; value: number }
export type Trigger =
  | { kind: 'schedule'; days: number[]; time: string }
  | { kind: 'timer'; at: number }
  | { kind: 'temperature'; op: 'gt' | 'lt'; value: number; hysteresis: number }
  | { kind: 'state'; field: 'Pow' | 'Mod'; value: number }
  | { kind: 'duration'; minutes: number };
export interface Rule {
  id: string; name: string; enabled: boolean; target: Target; trigger: Trigger;
  match: 'all' | 'any'; conditions: Condition[]; action: Patch; cooldownMinutes: number;
}
export interface History { id: string; at: number; device?: string; rule?: string; name: string; status: 'success' | 'failure' | 'skipped'; message: string; origin?: 'manual'|'automation'|'external'|'system'; reason?: string; fields?: string[]; before?: Patch; after?: Patch }
export interface Settings { theme: 'light' | 'dark' | 'system'; startup: boolean; pollSeconds: number }
export interface Snapshot { devices: Device[]; groups: Group[]; rules: Rule[]; history: History[]; settings: Settings; scanning: boolean; diagnostic: string; comfortSelection?:string }
export interface Result { mac: string; ok: boolean; message: string }
export interface DeviceChange { mac: string; fields: string[]; origin: 'manual' | 'automation' | 'network'; at: number }
export interface FlyoutTransition { id: number; phase: 'opening' | 'open' | 'closing' | 'hidden' }
export interface ExternalOverride { at:number; fields:string[]; before:Patch; after:Patch }
export interface Maintenance { enabled:boolean; lastDate:string; intervalDays:number; snoozedUntil?:string }
export interface ComfortSample { mac:string; at:number; ambient?:number; target?:number; segment?:string }
export interface ObservedInterval { id?:string; mac:string; start:number; end:number; on:boolean }
export interface ComfortSummary { min?:number; max?:number; samples:number; coverage:number; observedToday:number; observedWeek:number; unobservedToday?:number; unobservedWeek?:number; nextSchedule?:{at:number; name:string}; maintenanceDue?:boolean }
export interface ComfortData { mac:string; from:number; to:number; samples:ComfortSample[]; events:History[]; summary:ComfortSummary }
export interface API {
  resumeExternalOverride(mac:string):Promise<void>;
  comfort(mac:string,hours:1|24|168):Promise<ComfortData>;
  saveMaintenance(mac:string,value:Maintenance):Promise<void>;
  maintenanceAction(mac:string,action:'done'|'snooze'):Promise<void>;
  favorite(target:Target,value:boolean):Promise<void>;
  snapshot(): Promise<Snapshot>; discover(ip?: string): Promise<void>;
  command(target: Target, patch: Patch): Promise<Result[]>;
  saveDevice(mac: string, changes: Pick<Device, 'name' | 'room' | 'features'>): Promise<void>;
  resume(mac: string): Promise<void>; saveGroup(group: Group): Promise<void>; deleteGroup(id: string): Promise<void>;
  saveRule(rule: Rule): Promise<void>; deleteRule(id: string): Promise<void>; testRule(id: string): Promise<Result[]>;
  settings(settings: Settings): Promise<void>; onChange(callback: (state: Snapshot) => void): () => void;
  openDashboard(page?: 'devices' | 'groups' | 'rules' | 'settings' | 'history' | 'comfort',mac?:string): Promise<void>;
  hideFlyout(): Promise<void>;
  flyoutReady(): Promise<FlyoutTransition>;
  completeFlyoutTransition(id: number): Promise<void>;
  onFlyoutTransition(callback: (transition: FlyoutTransition) => void): () => void;
  onDeviceChange(callback: (change: DeviceChange) => void): () => void;
  onNavigate(callback: (page: 'devices' | 'groups' | 'rules' | 'settings' | 'history' | 'comfort') => void): () => void;
}
declare global { interface Window { gree: API } }
