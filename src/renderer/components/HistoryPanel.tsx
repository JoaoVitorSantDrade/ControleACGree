import { controlLabels,controlValue } from '../../shared/controlLabels';
import React, { useState } from 'react';
import type { Snapshot } from '../../shared/types';

export function HistoryPanel({state}:{state:Snapshot}) {
  const [query,setQuery]=useState(''),[device,setDevice]=useState(''),[status,setStatus]=useState(''),[origin,setOrigin]=useState(''),[from,setFrom]=useState(''),[until,setUntil]=useState(''),[size,setSize]=useState(20),[page,setPage]=useState(1);
  const name=(id?:string)=>state.devices.find(d=>d.mac===id)?.name || (id?'Aparelho removido':'Sistema');
  const start=from?new Date(`${from}T00:00:00`).getTime():-Infinity;
  const end=until?new Date(`${until}T23:59:59.999`).getTime():Infinity;
  const filtered=state.history.filter(h=>(!device || (device==='system'?!h.device:h.device===device)) && (!status || h.status===status) && (!origin || (origin==='rule'?h.origin==='automation' || !!h.rule:origin==='external'?h.origin==='external':origin==='protection'?h.reason==='external-protection':h.origin==='manual' || (!h.origin&&!h.rule))) && h.at>=start && h.at<=end && `${h.name} ${h.message} ${name(h.device)}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).sort((a,b)=>b.at-a.at);
  const pages=Math.max(1,Math.ceil(filtered.length/size)),current=Math.min(page,pages),rows=filtered.slice((current-1)*size,current*size);
  const reset=()=>{setQuery('');setDevice('');setStatus('');setOrigin('');setFrom('');setUntil('');setPage(1);};
  return <section className="history-view">
    <div className="panel history-filters" onChange={()=>setPage(1)}>
      <label className="history-search">Buscar<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nome, aparelho ou detalhes"/></label>
      <label>Aparelho<select value={device} onChange={e=>setDevice(e.target.value)}><option value="">Todos</option><option value="system">Sistema</option>{state.devices.map(d=><option key={d.mac} value={d.mac}>{d.name}</option>)}</select></label>
      <label>Resultado<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option><option value="success">Confirmado</option><option value="failure">Falhou</option><option value="skipped">Não executado</option></select></label>
      <label>Origem<select value={origin} onChange={e=>setOrigin(e.target.value)}><option value="">Todas</option><option value="rule">Automação</option><option value="other">Manual / sistema</option><option value="external">Controle externo</option><option value="protection">Proteção externa</option></select></label>
      <label>De<input type="date" value={from} max={until || undefined} onChange={e=>setFrom(e.target.value)}/></label><label>Até<input type="date" value={until} min={from || undefined} onChange={e=>setUntil(e.target.value)}/></label>
      <button className="secondary" onClick={reset}>Limpar filtros</button>
    </div>
    <p className="history-count" role="status">{filtered.length} de {state.history.length} registros disponíveis</p>
    <div className="panel history-panel"><table><thead><tr><th>Quando</th><th>Origem / aparelho</th><th>Resultado</th><th>Detalhes</th></tr></thead><tbody>{rows.map(h=><tr key={h.id}><td>{new Date(h.at).toLocaleString('pt-BR')}</td><td><strong>{h.name}</strong><small>{name(h.device)}</small></td><td><span className={`pill ${h.status}`}>{h.status==='success'?'Confirmado':h.status==='failure'?'Falhou':'Não executado'}</span></td><td>{h.message}{h.fields&&<small className="history-change">{h.fields.map(f=>`${controlLabels[f] || f}: ${controlValue(f,h.before?.[f])} → ${controlValue(f,h.after?.[f])}`).join(" · ")}</small>}</td></tr>)}</tbody></table>{!rows.length && <div className="history-empty">{state.history.length?'Nenhum registro corresponde aos filtros.':'Os comandos e execuções aparecerão aqui.'}</div>}</div>
    <nav className="history-pagination" aria-label="Paginação do histórico"><label>Por página<select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}>{[10,20,50].map(n=><option key={n} value={n}>{n}</option>)}</select></label><span>Página {current} de {pages}</span><button className="secondary" disabled={current===1} onClick={()=>setPage(current-1)}>Anterior</button><button className="secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>Próxima</button></nav>
  </section>;
}
