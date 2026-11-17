import initSqlJs, { type Database } from 'sql.js';
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync, openSync, fsyncSync, closeSync, copyFileSync } from 'node:fs';
import path from 'node:path';
export class Storage {
  private constructor(private db: Database, private file: string) {}
  static async open(directory: string, wasm: string) {
    mkdirSync(directory, { recursive: true });
    const file = path.join(directory, 'gree.sqlite');
    const SQL = await initSqlJs({ locateFile: () => wasm });
    const load=(bytes:Uint8Array)=>{
      const db=new SQL.Database(bytes);
      try { if(db.exec('PRAGMA quick_check')[0]?.values[0]?.[0]!=='ok')throw new Error('Integridade SQLite inválida.'); return db; }
      catch(error){db.close();throw error;}
    };
    let db:Database;
    try { db=existsSync(file)?load(readFileSync(file)):new SQL.Database(); }
    catch(error) {
      if(!existsSync(`${file}.bak`))throw new Error('O banco de dados está danificado e não há backup automático válido. Seus arquivos foram preservados.',{cause:error});
      try { db=load(readFileSync(`${file}.bak`)); }
      catch { throw new Error('O banco de dados e o backup estão danificados. Seus arquivos foram preservados.',{cause:error}); }
      copyFileSync(file,`${file}.damaged-${Date.now()}`);
      copyFileSync(`${file}.bak`,file);
    }
    db.run('CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(kind,id))');
    return new Storage(db, file);
  }
  all<T>(kind: string): T[] {
    const query = this.db.prepare('SELECT data FROM records WHERE kind = ?');
    query.bind([kind]); const values: T[] = [];
    while (query.step()) values.push(JSON.parse(query.getAsObject().data as string));
    query.free(); return values;
  }
  range<T>(kind:string,from:number,to:number,field='at',mac?:string):T[] {
    if(!['at','end'].includes(field))throw new Error('Campo inválido.');
    const q=this.db.prepare(`SELECT data FROM records WHERE kind=? AND json_extract(data,'$.${field}')>=? AND json_extract(data,'$.${field}')<=? ${mac?"AND json_extract(data,'$.mac')=?":''} ORDER BY json_extract(data,'$.${field}') LIMIT 12000`);q.bind(mac?[kind,from,to,mac]:[kind,from,to]);const values:T[]=[];while(q.step())values.push(JSON.parse(q.getAsObject().data as string));q.free();return values;
  }
  prune(kind:string,before:number,field='at') { if(!['at','end'].includes(field))throw new Error('Campo inválido.');this.db.run(`DELETE FROM records WHERE kind=? AND json_extract(data,'$.${field}')<?`,[kind,before]);if(kind==='observed')this.db.run("UPDATE records SET data=json_set(data,'$.start',?) WHERE kind='observed' AND json_extract(data,'$.start')<?",[before,before]);this.flush(); }
  put(kind: string, id: string, value: unknown) {
    this.db.run('INSERT OR REPLACE INTO records VALUES (?, ?, ?)', [kind, id, JSON.stringify(value)]);
    this.flush();
  }
  remove(kind: string, id: string) { this.db.run('DELETE FROM records WHERE kind = ? AND id = ?', [kind, id]); this.flush(); }
  trimHistory(limit = 1000) {
    this.db.run("DELETE FROM records WHERE kind='history' AND id NOT IN (SELECT id FROM records WHERE kind='history' ORDER BY json_extract(data,'$.at') DESC LIMIT ?)", [limit]);
    this.flush();
  }
  private flush() {
    const bytes=this.db.export();
    this.writeDurable(`${this.file}.tmp`,bytes);
    this.replaceFile(`${this.file}.tmp`,this.file);
    this.writeDurable(`${this.file}.bak.tmp`,bytes);
    this.replaceFile(`${this.file}.bak.tmp`,`${this.file}.bak`);
  }
  private replaceFile(source:string,target:string) {
    for(let attempt=0;;attempt++) {
      try {renameSync(source,target);return;}
      catch(error) {
        const code=(error as NodeJS.ErrnoException).code;
        if(attempt>=5 || !['EPERM','EACCES','EBUSY'].includes(code || ''))throw error;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10*2**attempt);
      }
    }
  }
  private writeDurable(file:string,bytes:Uint8Array) {
    const descriptor=openSync(file,'w');
    try { writeFileSync(descriptor,bytes);fsyncSync(descriptor); }
    finally {closeSync(descriptor);}
  }
  close() { this.flush(); this.db.close(); }
}
