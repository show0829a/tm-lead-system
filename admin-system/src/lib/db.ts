import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function getDbFilePath(): string {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, '.pglite-data'))) {
    return path.join(cwd, '.pglite-data', 'db.json');
  }
  if (fs.existsSync(path.join(cwd, 'admin-system', '.pglite-data'))) {
    return path.join(cwd, 'admin-system', '.pglite-data', 'db.json');
  }
  const fallback = path.resolve(__dirname, '../../.pglite-data/db.json');
  const dir = path.dirname(fallback);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return fallback;
}

interface DbData {
  users: any[];
  sites: any[];
  siteTmMappings: any[];
  systemAllocationConfig: any[];
  leads: any[];
  consultMemos: any[];
  smsLogs: any[];
  auditLogs: any[];
}

function emptyDb(): DbData {
  return {
    users: [],
    sites: [],
    siteTmMappings: [],
    systemAllocationConfig: [],
    leads: [],
    consultMemos: [],
    smsLogs: [],
    auditLogs: [],
  };
}

function readDb(): DbData {
  const filePath = getDbFilePath();
  if (!fs.existsSync(filePath)) {
    const data = emptyDb();
    writeDb(data);
    return data;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content);
    return {
      users: parsed.users || [],
      sites: parsed.sites || [],
      siteTmMappings: parsed.siteTmMappings || [],
      systemAllocationConfig: parsed.systemAllocationConfig || [],
      leads: parsed.leads || [],
      consultMemos: parsed.consultMemos || [],
      smsLogs: parsed.smsLogs || [],
      auditLogs: parsed.auditLogs || [],
    };
  } catch (err) {
    return emptyDb();
  }
}

function writeDb(data: DbData): void {
  const filePath = getDbFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, filePath);
}

function matchesWhere(item: any, where: any): boolean {
  if (!where || typeof where !== 'object') return true;

  if (Array.isArray(where.AND)) {
    for (const condition of where.AND) {
      if (!matchesWhere(item, condition)) return false;
    }
  }

  if (Array.isArray(where.OR)) {
    let anyMatched = false;
    for (const condition of where.OR) {
      if (matchesWhere(item, condition)) {
        anyMatched = true;
        break;
      }
    }
    if (!anyMatched) return false;
  }

  if (where.siteId_tmId) {
    if (item.siteId !== where.siteId_tmId.siteId || item.tmId !== where.siteId_tmId.tmId) {
      return false;
    }
  }

  for (const [key, val] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'siteId_tmId') continue;

    const itemVal = item[key];

    if (val && typeof val === 'object' && !(val instanceof Date)) {
      if ('equals' in (val as any)) {
        if (itemVal !== (val as any).equals) return false;
      }
      if ('in' in (val as any)) {
        if (!((val as any).in as any[]).includes(itemVal)) return false;
      }
      if ('notIn' in (val as any)) {
        if (((val as any).notIn as any[]).includes(itemVal)) return false;
      }
      if ('not' in (val as any)) {
        if (itemVal === (val as any).not) return false;
      }
      if ('gte' in (val as any)) {
        const threshold = (val as any).gte instanceof Date ? (val as any).gte.getTime() : new Date((val as any).gte).getTime();
        const current = itemVal instanceof Date ? itemVal.getTime() : new Date(itemVal).getTime();
        if (current < threshold) return false;
      }
      if ('lte' in (val as any)) {
        const threshold = (val as any).lte instanceof Date ? (val as any).lte.getTime() : new Date((val as any).lte).getTime();
        const current = itemVal instanceof Date ? itemVal.getTime() : new Date(itemVal).getTime();
        if (current > threshold) return false;
      }
      if ('gt' in (val as any)) {
        const threshold = (val as any).gt instanceof Date ? (val as any).gt.getTime() : new Date((val as any).gt).getTime();
        const current = itemVal instanceof Date ? itemVal.getTime() : new Date(itemVal).getTime();
        if (current <= threshold) return false;
      }
      if ('lt' in (val as any)) {
        const threshold = (val as any).lt instanceof Date ? (val as any).lt.getTime() : new Date((val as any).lt).getTime();
        const current = itemVal instanceof Date ? itemVal.getTime() : new Date(itemVal).getTime();
        if (current >= threshold) return false;
      }
      if ('contains' in (val as any)) {
        const search = String((val as any).contains).toLowerCase();
        if (!String(itemVal || '').toLowerCase().includes(search)) return false;
      }
      if ('startsWith' in (val as any)) {
        const search = String((val as any).startsWith).toLowerCase();
        if (!String(itemVal || '').toLowerCase().startsWith(search)) return false;
      }
    } else if (val instanceof Date) {
      const itemTime = itemVal instanceof Date ? itemVal.getTime() : new Date(itemVal).getTime();
      if (itemTime !== val.getTime()) return false;
    } else {
      if (itemVal !== val) return false;
    }
  }

  return true;
}

function enrichItem(modelName: string, item: any, include: any, db: DbData): any {
  if (!include || !item) return { ...item };
  const enriched = { ...item };

  if (modelName === 'user') {
    if (include.siteMappings) {
      enriched.siteMappings = db.siteTmMappings
        .filter((m) => m.tmId === item.id)
        .map((m) => (include.siteMappings.include ? enrichItem('siteTmMapping', m, include.siteMappings.include, db) : m));
    }
    if (include.assignedLeads) {
      enriched.assignedLeads = db.leads.filter((l) => l.assignedTmId === item.id);
    }
    if (include.consultMemos) {
      enriched.consultMemos = db.consultMemos.filter((c) => c.authorId === item.id);
    }
    if (include.smsLogs) {
      enriched.smsLogs = db.smsLogs.filter((s) => s.tmId === item.id);
    }
    if (include.auditLogs) {
      enriched.auditLogs = db.auditLogs.filter((a) => a.userId === item.id);
    }
  } else if (modelName === 'site') {
    if (include.tmMappings) {
      let mappings = db.siteTmMappings.filter((m) => m.siteId === item.id);
      mappings.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      enriched.tmMappings = mappings.map((m) =>
        include.tmMappings.include ? enrichItem('siteTmMapping', m, include.tmMappings.include, db) : m
      );
    }
    if (include.leads) {
      enriched.leads = db.leads.filter((l) => l.siteId === item.id);
    }
  } else if (modelName === 'siteTmMapping') {
    if (include.site) {
      enriched.site = db.sites.find((s) => s.id === item.siteId) || null;
    }
    if (include.tm) {
      enriched.tm = db.users.find((u) => u.id === item.tmId) || null;
    }
  } else if (modelName === 'lead') {
    if (include.site) {
      enriched.site = db.sites.find((s) => s.id === item.siteId) || null;
    }
    if (include.assignedTm) {
      enriched.assignedTm = db.users.find((u) => u.id === item.assignedTmId) || null;
    }
    if (include.memos) {
      let memos = db.consultMemos.filter((m) => m.leadId === item.id);
      memos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      enriched.memos = memos.map((m) => (include.memos.include ? enrichItem('consultMemo', m, include.memos.include, db) : m));
    }
    if (include.smsLogs) {
      let logs = db.smsLogs.filter((s) => s.leadId === item.id);
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      enriched.smsLogs = logs.map((s) => (include.smsLogs.include ? enrichItem('smsLog', s, include.smsLogs.include, db) : s));
    }
    if (include.auditLogs) {
      let logs = db.auditLogs.filter((a) => a.leadId === item.id);
      logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      enriched.auditLogs = logs.map((a) => (include.auditLogs.include ? enrichItem('auditLog', a, include.auditLogs.include, db) : a));
    }
  } else if (modelName === 'consultMemo') {
    if (include.lead) {
      enriched.lead = db.leads.find((l) => l.id === item.leadId) || null;
    }
    if (include.author) {
      enriched.author = db.users.find((u) => u.id === item.authorId) || null;
    }
  } else if (modelName === 'smsLog') {
    if (include.lead) {
      enriched.lead = db.leads.find((l) => l.id === item.leadId) || null;
    }
    if (include.tm) {
      enriched.tm = db.users.find((u) => u.id === item.tmId) || null;
    }
  } else if (modelName === 'auditLog') {
    if (include.user) {
      enriched.user = db.users.find((u) => u.id === item.userId) || null;
    }
    if (include.lead) {
      enriched.lead = db.leads.find((l) => l.id === item.leadId) || null;
    }
  }

  return enriched;
}

function sortItems(items: any[], orderBy: any): any[] {
  if (!orderBy) return items;
  const orderList = Array.isArray(orderBy) ? orderBy : [orderBy];

  return [...items].sort((a, b) => {
    for (const order of orderList) {
      for (const [key, dir] of Object.entries(order)) {
        const valA = a[key];
        const valB = b[key];
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        const isAsc = String(dir).toLowerCase() === 'asc';
        if (typeof valA === 'number' && typeof valB === 'number') {
          return isAsc ? valA - valB : valB - valA;
        }
        if (valA instanceof Date || valB instanceof Date || (typeof valA === 'string' && valA.match(/^\d{4}-\d{2}-\d{2}/))) {
          const timeA = new Date(valA).getTime();
          const timeB = new Date(valB).getTime();
          return isAsc ? timeA - timeB : timeB - timeA;
        }
        return isAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      }
    }
    return 0;
  });
}

function createModelHandler(modelName: string, tableName: keyof DbData) {
  return {
    async findUnique(args: { where: any; include?: any }) {
      const db = readDb();
      const list = db[tableName] as any[];
      const found = list.find((item) => matchesWhere(item, args.where));
      return found ? enrichItem(modelName, found, args.include, db) : null;
    },

    async findFirst(args?: { where?: any; include?: any; orderBy?: any }) {
      const db = readDb();
      let list = db[tableName] as any[];
      if (args?.where) {
        list = list.filter((item) => matchesWhere(item, args.where));
      }
      if (args?.orderBy) {
        list = sortItems(list, args.orderBy);
      }
      const found = list[0];
      return found ? enrichItem(modelName, found, args?.include, db) : null;
    },

    async findMany(args?: { where?: any; include?: any; orderBy?: any; skip?: number; take?: number }) {
      const db = readDb();
      let list = db[tableName] as any[];
      if (args?.where) {
        list = list.filter((item) => matchesWhere(item, args.where));
      }
      if (args?.orderBy) {
        list = sortItems(list, args.orderBy);
      }
      if (typeof args?.skip === 'number') {
        list = list.slice(args.skip);
      }
      if (typeof args?.take === 'number') {
        list = list.slice(0, args.take);
      }
      return list.map((item) => enrichItem(modelName, item, args?.include, db));
    },

    async count(args?: { where?: any }) {
      const db = readDb();
      let list = db[tableName] as any[];
      if (args?.where) {
        list = list.filter((item) => matchesWhere(item, args.where));
      }
      return list.length;
    },

    async create(args: { data: any; include?: any }) {
      const db = readDb();
      const now = new Date();
      const newItem: any = {
        id: args.data.id || (tableName === 'systemAllocationConfig' ? 1 : crypto.randomUUID()),
        ...args.data,
        createdAt: args.data.createdAt || now,
        updatedAt: now,
      };

      (db[tableName] as any[]).push(newItem);
      writeDb(db);
      return enrichItem(modelName, newItem, args.include, db);
    },

    async createMany(args: { data: any[] }) {
      const db = readDb();
      const now = new Date();
      let count = 0;
      for (const row of args.data) {
        const newItem: any = {
          id: row.id || (tableName === 'systemAllocationConfig' ? 1 : crypto.randomUUID()),
          ...row,
          createdAt: row.createdAt || now,
          updatedAt: now,
        };
        (db[tableName] as any[]).push(newItem);
        count++;
      }
      writeDb(db);
      return { count };
    },

    async update(args: { where: any; data: any; include?: any }) {
      const db = readDb();
      const list = db[tableName] as any[];
      const idx = list.findIndex((item) => matchesWhere(item, args.where));
      if (idx === -1) {
        throw new Error(`Record to update not found in ${tableName}`);
      }
      const existing = list[idx];
      const updated: any = {
        ...existing,
        ...args.data,
        updatedAt: new Date(),
      };
      list[idx] = updated;
      writeDb(db);
      return enrichItem(modelName, updated, args.include, db);
    },

    async updateMany(args: { where?: any; data: any }) {
      const db = readDb();
      const list = db[tableName] as any[];
      let count = 0;
      for (let i = 0; i < list.length; i++) {
        if (!args.where || matchesWhere(list[i], args.where)) {
          list[i] = {
            ...list[i],
            ...args.data,
            updatedAt: new Date(),
          };
          count++;
        }
      }
      writeDb(db);
      return { count };
    },

    async delete(args: { where: any }) {
      const db = readDb();
      const list = db[tableName] as any[];
      const idx = list.findIndex((item) => matchesWhere(item, args.where));
      if (idx === -1) {
        throw new Error(`Record to delete not found in ${tableName}`);
      }
      const [removed] = list.splice(idx, 1);
      writeDb(db);
      return removed;
    },

    async deleteMany(args?: { where?: any }) {
      const db = readDb();
      const list = db[tableName] as any[];
      const initialLen = list.length;
      if (!args?.where) {
        db[tableName] = [] as any;
        writeDb(db);
        return { count: initialLen };
      }
      const remaining = list.filter((item) => !matchesWhere(item, args.where));
      db[tableName] = remaining as any;
      writeDb(db);
      return { count: initialLen - remaining.length };
    },

    async upsert(args: { where: any; create: any; update: any; include?: any }) {
      const db = readDb();
      const list = db[tableName] as any[];
      const idx = list.findIndex((item) => matchesWhere(item, args.where));
      if (idx !== -1) {
        const existing = list[idx];
        const updated = {
          ...existing,
          ...args.update,
          updatedAt: new Date(),
        };
        list[idx] = updated;
        writeDb(db);
        return enrichItem(modelName, updated, args.include, db);
      } else {
        const now = new Date();
        const newItem: any = {
          id: args.create.id || (tableName === 'systemAllocationConfig' ? 1 : crypto.randomUUID()),
          ...args.create,
          createdAt: now,
          updatedAt: now,
        };
        list.push(newItem);
        writeDb(db);
        return enrichItem(modelName, newItem, args.include, db);
      }
    },
  };
}

class DatabaseClient {
  user = createModelHandler('user', 'users');
  site = createModelHandler('site', 'sites');
  siteTmMapping = createModelHandler('siteTmMapping', 'siteTmMappings');
  systemAllocationConfig = createModelHandler('systemAllocationConfig', 'systemAllocationConfig');
  lead = createModelHandler('lead', 'leads');
  consultMemo = createModelHandler('consultMemo', 'consultMemos');
  smsLog = createModelHandler('smsLog', 'smsLogs');
  auditLog = createModelHandler('auditLog', 'auditLogs');

  async $transaction<T>(fn: (tx: DatabaseClient) => Promise<T>): Promise<T>;
  async $transaction<T extends any[]>(promises: [...T]): Promise<T>;
  async $transaction<T>(arg: ((tx: DatabaseClient) => Promise<T>) | Promise<any>[]): Promise<T | any[]> {
    if (typeof arg === 'function') {
      return await arg(this);
    }
    if (Array.isArray(arg)) {
      return await Promise.all(arg);
    }
    throw new Error('Unsupported $transaction argument');
  }

  async $queryRaw(strings: TemplateStringsArray | string, ...values: any[]): Promise<any[]> {
    let sql = typeof strings === 'string' ? strings : strings.join('?');
    const lower = sql.toLowerCase();

    if (lower.includes('from system_allocation_config') || lower.includes('from "system_allocation_config"')) {
      const config = await this.systemAllocationConfig.findFirst();
      return config
        ? [
            {
              id: config.id,
              next_global_tm_id: config.nextGlobalTmId,
              default_sms_template: config.defaultSmsTemplate,
              duplicate_block_minutes: config.duplicateBlockMinutes,
            },
          ]
        : [];
    }

    if (lower.includes('from sites') || lower.includes('from "sites"')) {
      const siteId = values[0];
      const site = siteId ? await this.site.findUnique({ where: { id: siteId } }) : await this.site.findFirst();
      return site
        ? [
            {
              id: site.id,
              name: site.name,
              next_tm_id: site.nextTmId,
              use_custom_mapping: site.useCustomMapping,
            },
          ]
        : [];
    }

    return [];
  }

  async $executeRaw(strings: TemplateStringsArray | string, ...values: any[]): Promise<number> {
    return 1;
  }

  async $disconnect(): Promise<void> {}
}

const globalForDb = globalThis as unknown as {
  prisma: DatabaseClient | undefined;
};

export const prisma = globalForDb.prisma ?? new DatabaseClient();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.prisma = prisma;
}

export default prisma;
