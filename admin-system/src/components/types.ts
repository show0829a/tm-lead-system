export interface TmUser {
  id: string;
  loginId: string;
  name: string;
  phone?: string | null;
  phoneMasked?: string | null;
  role: 'ADMIN' | 'TM';
  isDbReceiveOn: boolean;
  isSmsReceiveOn: boolean;
  globalOrder: number;
  isActive: boolean;
  createdAt?: string;
}

export interface SiteTmMappingItem {
  id: string;
  siteId: string;
  tmId: string;
  orderIndex: number;
  tm?: TmUser;
}

export interface SiteItem {
  id: string;
  name: string;
  domainUrl: string;
  apiKey: string;
  useCustomMapping: boolean;
  customSmsTemplate?: string | null;
  nextTmId?: string | null;
  isActive: boolean;
  createdAt: string;
  siteTmMappings?: SiteTmMappingItem[];
}

export interface ConsultMemoItem {
  id: string;
  leadId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    loginId?: string;
  };
}

export interface LeadItem {
  id: string;
  siteId: string;
  assignedTmId: string | null;
  customerName: string;
  phoneMasked: string;
  phoneFull?: string; // present when revealed
  carModel: string;
  carNumber?: string | null;
  carYear?: string | null;
  mileage?: string | null;
  region?: string | null;
  extraData?: any;
  estimatedPrice?: number | null;
  status: string;
  assignType: 'AUTO' | 'MANUAL';
  createdAt: string;
  assignedAt?: string | null;
  updatedAt?: string;
  site?: {
    id: string;
    name: string;
  };
  assignedTm?: {
    id: string;
    name: string;
    loginId: string;
  } | null;
  memos?: ConsultMemoItem[];
}

export interface SmsLogItem {
  id: string;
  leadId: string;
  tmId: string;
  receiverPhoneMasked: string;
  message: string;
  status: 'MOCK_SENT' | 'SENT' | 'FAILED' | 'SKIPPED';
  errorMessage?: string | null;
  createdAt: string;
  lead?: {
    id: string;
    customerName: string;
    carModel: string;
  };
  tm?: {
    id: string;
    name: string;
    loginId: string;
  };
}

export interface SystemConfig {
  id: number;
  nextGlobalTmId: string | null;
  defaultSmsTemplate: string;
  duplicateBlockMinutes: number;
}

export interface CurrentUser {
  id: string;
  loginId: string;
  name: string;
  role: 'ADMIN' | 'TM';
  phone?: string | null;
  isDbReceiveOn: boolean;
  isSmsReceiveOn: boolean;
  globalOrder?: number;
}
