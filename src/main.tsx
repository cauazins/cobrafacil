import { useState } from "react";

function formatPhone(v) {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v;
  if (v.length <= 7) return `(${v.slice(0,2)}) ${v.slice(2)}`;
  return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
}
function formatBRL(v) {
  return Number(v).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function getToday() { return new Date().toLocaleDateString("pt-BR"); }

const GRUPOS = [
  { id:"ate18", label:"⏰ Até 18h", cor:"#1a73e8", corBg:"#e3f2fd" },
  { id:"apos18", label:"🌙 Após 18h", cor:"#7b1fa2", corBg:"#f3e5f5" },
];
const HORARIOS_PADRAO = { ate18:["08:00","12:00","17:00"], apos18:["10:00","15:00","20:00"] };
const MSG_PADRAO_GRUPO = {
  ate18:[
    "Olá {nome}! 😊 Bom dia! Parcela {parcela_atual}/{total_parcelas} — *{valor}* vence hoje.",
    "Oi {nome}! 👋 Lembrete: parcela {parcela_atual}/{total_parcelas} de *{valor}* ainda pendente!",
    "⚠️ {nome}, último aviso! Parcela {parcela_atual}/{total_parcelas} de *{valor}* em aberto. Me contate urgente!",
  ],
  apos18:[
    "Olá {nome}! 😊 Parcela {parcela_atual}/{total_parcelas} — *{valor}* vence hoje.",
    "Oi {nome}! 🔔 Parcela {parcela_atual}/{total_parcelas} de *{valor}* ainda em aberto.",
    "⚠️ {nome}, está ficando tarde! Parcela {parcela_atual}/{total_parcelas} de *{valor}* pendente!",
  ],
};
const MSG_CONFIRM_PADRAO = "✅ Pagamento confirmado!\n\nOlá {nome}, recebemos a parcela {parcela_atual}/{total_parcelas} de *{valor}* às {hora}. Obrigado! 🙏\n\n📊 Situação do dia: {pagos} de {total} clientes pagaram.";
const AVISO_LABELS = ["1º Aviso","2º Aviso","3º Aviso"];
const AVISO_ICONS = ["🌅","☀️","⚠️"];
const VALORES_RENOVACAO = [300, 400, 500];

const INIT = [
  { id:1, nome:"João Silva", whatsapp:"(11) 99999-1111", valor:50, ativo:true, grupo:"ate18", mensagens:["","",""], totalParcelas:10, parcelaAtual:1, historico:[] },
  { id:2, nome:"Maria Souza", whatsapp:"(11) 99999-2222", valor:80, ativo:true, grupo:"ate18", mensagens:["","",""], totalParcelas:8, parcelaAtual:1, historico:[] },
  { id:3, nome:"Carlos Lima", whatsapp:"(11) 99999-3333", valor:30, ativo:true, grupo:"apos18", mensagens:["","",""], totalParcelas:15, parcelaAtual:1, historico:[] },
];

function applyVars(msg, cl, pagos=0, total=0, hora="") {
  return (msg||"")
    .replace(/{nome}/g, cl.nome||"Cliente")
    .replace(/{valor}/g, formatBRL(cl.valor||0))
    .replace(/{parcela_atual}/g, cl.parcelaAtual||1)
    .replace(/{total_parcelas}/g, cl.totalParcelas||1)
    .replace(/{hora}/g, hora)
    .replace(/{pagos}/g, pagos)
    .replace(/{total}/g, total);
}

function ProgressBar({ atual, total, cor }) {
  const pct = Math.min(100, Math.round((atual - 1) / total * 100));
  return (
    <div style={{marginTop:6}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#666",marginBottom:3}}>
        <span>Parcela {atual} de {total}</span>
        <span>{pct}% quitado</span>
      </div>
      <div style={{background:"#eee",borderRadius:99,height:7,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,background:cor,height:"100%",borderRadius:99,transition:"width .3s"}}/>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("clientes");
  const [grupoAtivo, setGrupoAtivo] = useState("ate18");
  const [clientes, setClientes] = useState(INIT);
  const [pagamentos, setPagamentos] = useState({});
  const [horarios, setHorarios] = useState({...HORARIOS_PADRAO});
  const [horariosEdit, setHorariosEdit] = useState({ate18:[...HORARIOS_PADRAO.ate18],apos18:[...HORARIOS_PADRAO.apos18]});
  const [msgGrupo, setMsgGrupo] = useState({ate18:[...MSG_PADRAO_GRUPO.ate18],apos18:[...MSG_PADRAO_GRUPO.apos18]});
  const [msgGrupoEdit, setMsgGrupoEdit] = useState({ate18:[...MSG_PADRAO_GRUPO.ate18],apos18:[...MSG_PADRAO_GRUPO.apos18]});
  const [msgConfirmEdit, setMsgConfirmEdit] = useState(MSG_CONFIRM_PADRAO);
  const [msgConfirmSalva, setMsgConfirmSalva] = useState(MSG_CONFIRM_PADRAO);
  const [disparos, setDisparos] = useState([]);
  const [modal, setModal] = useState(null); // "add"|"renovar"|null
  const [form, setForm] = useState({ nome:"",whatsapp:"",valor:"",ativo:true,grupo:"ate18",mensagens:["","",""],totalParcelas:10,parcelaAtual:1 });
  const [editId, setEditId] = useState(null);
  const [avisoPreview, setAvisoPreview] = useState(0);
  const [msgTab, setMsgTab] = useState("ate18");
  const [renovarCliente, setRenovarCliente] = useState(null);
  const [renovForm, setRenovForm] = useState({ valorEmprestimo:500, valor:"", totalParcelas:10 });
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  function showToast(msg, tipo="ok") { setToast({msg,tipo}); setTimeout(()=>setToast(null),2800); }

  function getMsgEfetiva(cl, idx) {
    return cl.mensagens?.[idx]?.trim() || msgGrupo[cl.grupo]?.[idx] || "";
  }

  function salvarCliente() {
    if (!form.nome.trim()||!form.whatsapp.trim()||!form.valor) { showToast("Preencha todos os campos!","erro"); return; }
    if (editId!==null) {
      setClientes(c=>c.map(cl=>cl.id===editId?{...cl,...form,valor:Number(form.valor),totalParcelas:Number(form.totalParcelas),parcelaAtual:Number(form.parcelaAtual)}:cl));
      showToast("Cliente atualizado!");
    } else {
      setClientes(c=>[...c,{...form,id:Date.now(),valor:Number(form.valor),totalParcelas:Number(form.totalParcelas),parcelaAtual:Number(form.parcelaAtual),historico:[]}]);
      showToast("Cliente cadastrado!");
    }
    setModal(null); setEditId(null);
    setForm({nome:"",whatsapp:"",valor:"",ativo:true,grupo:grupoAtivo,mensagens:["","",""],totalParcelas:10,parcelaAtual:1});
  }

  function abrirAdd() {
    setForm({nome:"",whatsapp:"",valor:"",ativo:true,grupo:grupoAtivo,mensagens:["","",""],totalParcelas:10,parcelaAtual:1});
    setEditId(null); setAvisoPreview(0); setModal("add");
  }
  function abrirEdit(cl) {
    setForm({nome:cl.nome,whatsapp:cl.whatsapp,valor:cl.valor,ativo:cl.ativo,grupo:cl.grupo,mensagens:[...(cl.mensagens||["","",""])],totalParcelas:cl.totalParcelas||10,parcelaAtual:cl.parcelaAtual||1});
    setEditId(cl.id); setAvisoPreview(0); setModal("add");
  }
  function excluir(id) {
    setClientes(c=>c.filter(cl=>cl.id!==id));
    setPagamentos(p=>{const n={...p};delete n[id];return n;});
    setConfirmDelete(null); showToast("Cliente removido.");
  }

  function togglePago(id) {
    const cl = clientes.find(c=>c.id===id);
    const novoStatus = !pagamentos[id];
    setPagamentos(p=>({...p,[id]:novoStatus}));
    if (novoStatus) {
      const totalAtivos = clientes.filter(c=>c.ativo).length;
      const jaPageram = clientes.filter(c=>c.ativo&&pagamentos[c.id]&&c.id!==id).length+1;
      const hora = new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
      const msgC = applyVars(msgConfirmSalva, cl, jaPageram, totalAtivos, hora);
      setDisparos(d=>[{id:Date.now()+cl.id,cliente:cl.nome,whatsapp:cl.whatsapp,valor:cl.valor,hora,grupo:cl.grupo,aviso:-1,mensagem:msgC},...d]);

      // avança parcela
      const novaParcela = (cl.parcelaAtual||1) + 1;
      const quitou = novaParcela > (cl.totalParcelas||1);
      setClientes(c=>c.map(x=>x.id===id ? {
        ...x,
        parcelaAtual: quitou ? x.totalParcelas : novaParcela,
        historico: [...(x.historico||[]), { parcela: x.parcelaAtual, valor: x.valor, data: getToday(), hora }]
      } : x));

      if (quitou) {
        setTimeout(()=>{
          setRenovarCliente(clientes.find(c=>c.id===id));
          setRenovForm({valorEmprestimo:500,valor:"",totalParcelas:10});
          setModal("renovar");
        }, 600);
        showToast(`🎉 ${cl.nome} quitou o empréstimo!`);
      } else {
        showToast(`✅ Parcela ${cl.parcelaAtual}/${cl.totalParcelas} — ${cl.nome}!`);
      }
    } else {
      // estorna parcela
      setClientes(c=>c.map(x=>x.id===id ? {
        ...x,
        parcelaAtual: Math.max(1, (x.parcelaAtual||1)-1),
        historico: (x.historico||[]).slice(0,-1)
      } : x));
      showToast(`↩ Parcela estornada — ${cl.nome}.`);
    }
  }

  function confirmarRenovacao() {
    if (!renovForm.valor||!renovForm.totalParcelas) { showToast("Preencha valor da parcela e total!","erro"); return; }
    const cl = renovarCliente;
    setClientes(c=>c.map(x=>x.id===cl.id ? {
      ...x,
      valor: Number(renovForm.valor),
      totalParcelas: Number(renovForm.totalParcelas),
      parcelaAtual: 1,
      historico: [...(x.historico||[]), { renovacao: true, emprestimo: renovForm.valorEmprestimo, data: getToday() }]
    } : x));
    setPagamentos(p=>({...p,[cl.id]:false}));
    setModal(null); setRenovarCliente(null);
    showToast(`🔄 Empréstimo renovado para ${cl.nome}!`);
  }

  function toggleAtivo(id) { setClientes(c=>c.map(cl=>cl.id===id?{...cl,ativo:!cl.ativo}:cl)); }
  function salvarMsgGrupo() { setMsgGrupo({ate18:[...msgGrupoEdit.ate18],apos18:[...msgGrupoEdit.apos18]}); showToast("Mensagens do grupo salvas!"); }
  function salvarHorarios() { setHorarios({ate18:[...horariosEdit.ate18],apos18:[...horariosEdit.apos18]}); showToast("Horários salvos!"); }
  function dispararGrupo(gid, avisoIdx) {
    const ativos=clientes.filter(c=>c.ativo&&!pagamentos[c.id]&&c.grupo===gid);
    if(!ativos.length){showToast("Nenhum pendente neste grupo.","info");return;}
    const hora=new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
    const novos=ativos.map(c=>({
      id:Date.now()+c.id,cliente:c.nome,whatsapp:c.whatsapp,valor:c.valor,hora,grupo:gid,aviso:avisoIdx,
      mensagem:applyVars(getMsgEfetiva(c,avisoIdx),c,0,0,hora),
    }));
    setDisparos(d=>[...novos,...d]);
    showToast(`📤 ${ativos.length} mensagem(ns) — ${AVISO_LABELS[avisoIdx]} disparada(s)!`);
  }

  const clientesGrupo=(gid)=>clientes.filter(c=>c.grupo===gid);
  const totalPago=clientes.filter(c=>pagamentos[c.id]).reduce((s,c)=>s+c.valor,0);
  const totalPend=clientes.filter(c=>c.ativo&&!pagamentos[c.id]).reduce((s,c)=>s+c.valor,0);
  const g=GRUPOS.find(x=>x.id===grupoAtivo);

  const tabs=[
    {id:"clientes",label:"👥 Clientes"},
    {id:"mensagens",label:"💬 Mensagens"},
    {id:"cobrancas",label:"📤 Disparos"},
    {id:"horarios",label:"⏰ Horários"},
    {id:"relatorio",label:"📊 Relatório"},
  ];

  return (
    <div style={{fontFamily:"sans-serif",background:"#f0f4ff",minHeight:"100vh",paddingBottom:48}}>
      <div style={{background:"linear-gradient(135deg,#1a73e8,#0d47a1)",color:"#fff",padding:"18px 20px 12px"}}>
        <div style={{fontSize:20,fontWeight:700}}>💰 CobraFácil</div>
        <div style={{fontSize:12,opacity:0.8}}>{getToday()} · {clientes.filter(c=>c.ativo).length} clientes ativos</div>
      </div>

      <div style={{display:"flex",background:"#fff",borderBottom:"2px solid #e0e7ff",overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:"11px 4px",border:"none",background:"none",cursor:"pointer",
            fontWeight:tab===t.id?700:400,fontSize:12,
            color:tab===t.id?"#1a73e8":"#555",
            borderBottom:tab===t.id?"2px solid #1a73e8":"2px solid transparent",
            whiteSpace:"nowrap"
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:16}}>

        {/* ── CLIENTES ── */}
        {tab==="clientes" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {GRUPOS.map(gr=>(
                <button key={gr.id} onClick={()=>setGrupoAtivo(gr.id)} style={{
                  flex:1,padding:"10px 8px",borderRadius:10,border:"2px solid",
                  borderColor:grupoAtivo===gr.id?gr.cor:"#ddd",
                  background:grupoAtivo===gr.id?gr.corBg:"#fff",
                  color:grupoAtivo===gr.id?gr.cor:"#777",
                  fontWeight:700,fontSize:13,cursor:"pointer"
                }}>
                  {gr.label}
                  <div style={{fontSize:11,fontWeight:400}}>{clientesGrupo(gr.id).length} clientes</div>
                </button>
              ))}
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontWeight:700,color:g.cor}}>{g.id==="ate18"?"Pagam até as 18h":"Pagam depois das 18h"}</span>
              <button onClick={abrirAdd} style={btnStyle(g.cor)}>+ Novo</button>
            </div>
            {clientesGrupo(grupoAtivo).length===0 && <div style={emptyStyle}>Nenhum cliente neste grupo.</div>}
            {clientesGrupo(grupoAtivo).map(cl=>{
              const quitou = (cl.parcelaAtual||1) >= (cl.totalParcelas||1) && pagamentos[cl.id];
              return (
                <div key={cl.id} style={{...cardStyle,borderLeft:`4px solid ${quitou?"#ff9800":g.cor}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15}}>{cl.nome}</div>
                      <div style={{color:"#555",fontSize:13}}>📱 {cl.whatsapp}</div>
                      <div style={{color:g.cor,fontWeight:600,fontSize:14}}>{formatBRL(cl.valor)}/parcela</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:5,alignItems:"flex-end"}}>
                      <span style={{...badgeStyle,background:cl.ativo?"#e8f5e9":"#fce4ec",color:cl.ativo?"#2e7d32":"#c62828"}}>{cl.ativo?"Ativo":"Inativo"}</span>
                      {pagamentos[cl.id]&&<span style={{...badgeStyle,background:"#e8f5e9",color:"#2e7d32"}}>✅ Pago hoje</span>}
                      {quitou&&<span style={{...badgeStyle,background:"#fff3e0",color:"#e65100"}}>🏆 Quitado</span>}
                    </div>
                  </div>

                  <ProgressBar atual={cl.parcelaAtual||1} total={cl.totalParcelas||1} cor={g.cor}/>

                  <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap"}}>
                    {quitou ? (
                      <button onClick={()=>{setRenovarCliente(cl);setRenovForm({valorEmprestimo:500,valor:"",totalParcelas:10});setModal("renovar");}} style={btnSmall("#ff9800")}>🔄 Renovar</button>
                    ) : (
                      <button onClick={()=>togglePago(cl.id)} style={btnSmall(pagamentos[cl.id]?"#757575":"#2e7d32")}>
                        {pagamentos[cl.id]?"↩ Estornar":"✅ Dar Baixa"}
                      </button>
                    )}
                    <button onClick={()=>abrirEdit(cl)} style={btnSmall("#f57c00")}>✏️ Editar</button>
                    <button onClick={()=>toggleAtivo(cl.id)} style={btnSmall(cl.ativo?"#5e35b1":"#1a73e8")}>{cl.ativo?"⏸ Pausar":"▶ Ativar"}</button>
                    <button onClick={()=>setConfirmDelete(cl.id)} style={btnSmall("#c62828")}>🗑</button>
                  </div>

                  {/* Histórico resumido */}
                  {(cl.historico||[]).length>0 && (
                    <div style={{marginTop:8,fontSize:11,color:"#888"}}>
                      Último pagamento: {cl.historico.filter(h=>!h.renovacao).slice(-1)[0]?.data||"—"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── MENSAGENS ── */}
        {tab==="mensagens" && (
          <div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>Mensagens padrão por grupo</div>
            <div style={{fontSize:12,color:"#666",marginBottom:10}}>Variáveis: <b>{"{nome}"}</b> <b>{"{valor}"}</b> <b>{"{parcela_atual}"}</b> <b>{"{total_parcelas}"}</b></div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {GRUPOS.map(gr=>(
                <button key={gr.id} onClick={()=>setMsgTab(gr.id)} style={{
                  flex:1,padding:"9px 6px",borderRadius:9,border:"2px solid",
                  borderColor:msgTab===gr.id?gr.cor:"#ddd",
                  background:msgTab===gr.id?gr.corBg:"#fff",
                  color:msgTab===gr.id?gr.cor:"#777",
                  fontWeight:700,fontSize:13,cursor:"pointer"
                }}>{gr.label}</button>
              ))}
            </div>
            {[0,1,2].map(i=>{
              const gr=GRUPOS.find(x=>x.id===msgTab);
              const fake={nome:"João",valor:50,parcelaAtual:3,totalParcelas:10};
              return (
                <div key={i} style={{...cardStyle,borderLeft:`4px solid ${gr.cor}`}}>
                  <div style={{fontWeight:700,color:gr.cor,marginBottom:6}}>{AVISO_ICONS[i]} {AVISO_LABELS[i]} — {horarios[msgTab]?.[i]}</div>
                  <textarea value={msgGrupoEdit[msgTab][i]} onChange={e=>{
                    const n={...msgGrupoEdit}; n[msgTab]=[...n[msgTab]]; n[msgTab][i]=e.target.value; setMsgGrupoEdit(n);
                  }} rows={3} style={{...inputStyle,resize:"vertical",fontFamily:"sans-serif",marginBottom:6}}/>
                  <div style={{background:"#f0f7ff",borderRadius:7,padding:"8px 10px",fontSize:12,color:"#333",whiteSpace:"pre-line"}}>
                    <b>Preview:</b>{"\n"}{applyVars(msgGrupoEdit[msgTab][i],fake)}
                  </div>
                </div>
              );
            })}
            <button onClick={salvarMsgGrupo} style={{...btnStyle("#2e7d32"),width:"100%",marginBottom:16}}>💾 Salvar Mensagens do Grupo</button>

            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>✅ Mensagem de confirmação de pagamento</div>
            <div style={{fontSize:12,color:"#666",marginBottom:10}}>Variáveis extras: <b>{"{hora}"}</b> <b>{"{pagos}"}</b> <b>{"{total}"}</b></div>
            <div style={{...cardStyle,borderLeft:"4px solid #2e7d32"}}>
              <textarea value={msgConfirmEdit} onChange={e=>setMsgConfirmEdit(e.target.value)} rows={5} style={{...inputStyle,resize:"vertical",fontFamily:"sans-serif"}}/>
              <div style={{background:"#e8f5e9",borderRadius:7,padding:"8px 10px",fontSize:12,color:"#333",whiteSpace:"pre-line",marginBottom:10}}>
                <b>Preview:</b>{"\n"}{applyVars(msgConfirmEdit,{nome:"João",valor:50,parcelaAtual:3,totalParcelas:10},3,10,"14:32")}
              </div>
              <button onClick={()=>{setMsgConfirmSalva(msgConfirmEdit);showToast("Mensagem de confirmação salva!");}} style={{...btnStyle("#2e7d32"),width:"100%"}}>💾 Salvar Confirmação</button>
            </div>
          </div>
        )}

        {/* ── DISPAROS ── */}
        {tab==="cobrancas" && (
          <div>
            {GRUPOS.map(gr=>{
              const pend=clientes.filter(c=>c.ativo&&!pagamentos[c.id]&&c.grupo===gr.id).length;
              return (
                <div key={gr.id} style={{...cardStyle,borderLeft:`4px solid ${gr.cor}`}}>
                  <div style={{fontWeight:700,color:gr.cor,marginBottom:10}}>{gr.label} · {pend} pendente(s)</div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    {[0,1,2].map(i=>(
                      <button key={i} onClick={()=>dispararGrupo(gr.id,i)} style={{...btnSmall(gr.cor),padding:"8px 12px",lineHeight:1.6}}>
                        {AVISO_ICONS[i]} {AVISO_LABELS[i]}<br/>
                        <span style={{fontSize:10,opacity:0.85}}>{horarios[gr.id]?.[i]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div style={{fontWeight:700,marginBottom:10,marginTop:4}}>Histórico</div>
            {disparos.length===0&&<div style={emptyStyle}>Nenhuma mensagem disparada ainda.</div>}
            {disparos.map(m=>{
              const gr=GRUPOS.find(x=>x.id===m.grupo);
              return (
                <div key={m.id} style={{...cardStyle,borderLeft:`4px solid ${m.aviso===-1?"#2e7d32":gr?.cor||"#ccc"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontWeight:600}}>{m.cliente}</span>
                    <span style={{fontSize:11,color:"#888"}}>⏱ {m.hora} · {m.aviso===-1?"✅ Confirmação":AVISO_ICONS[m.aviso]+" "+AVISO_LABELS[m.aviso]}</span>
                  </div>
                  <div style={{fontSize:12,color:"#666",marginBottom:6}}>📱 {m.whatsapp} · {formatBRL(m.valor)}</div>
                  <div style={{background:m.aviso===-1?"#e8f5e9":"#f9f9f9",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#333",whiteSpace:"pre-line"}}>{m.mensagem}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── HORÁRIOS ── */}
        {tab==="horarios" && (
          <div>
            {GRUPOS.map(gr=>(
              <div key={gr.id} style={{...cardStyle,borderLeft:`4px solid ${gr.cor}`}}>
                <div style={{fontWeight:700,color:gr.cor,marginBottom:12}}>{gr.label}</div>
                {horariosEdit[gr.id].map((h,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <span style={{fontSize:13,width:90}}>{AVISO_ICONS[i]} {AVISO_LABELS[i]}</span>
                    <input type="time" value={h} onChange={e=>{
                      const n={...horariosEdit}; n[gr.id]=[...n[gr.id]]; n[gr.id][i]=e.target.value; setHorariosEdit(n);
                    }} style={inputStyle}/>
                  </div>
                ))}
              </div>
            ))}
            <button onClick={salvarHorarios} style={{...btnStyle("#2e7d32"),width:"100%"}}>💾 Salvar Horários</button>
          </div>
        )}

        {/* ── RELATÓRIO ── */}
        {tab==="relatorio" && (
          <div>
            <div style={{fontWeight:700,fontSize:16,marginBottom:12}}>📊 Relatório — {getToday()}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
              <div style={{background:"#e8f5e9",borderRadius:12,padding:16,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:800,color:"#2e7d32"}}>{clientes.filter(c=>pagamentos[c.id]).length}</div>
                <div style={{fontSize:13,color:"#555"}}>Pagos hoje</div>
                <div style={{fontWeight:700,color:"#2e7d32"}}>{formatBRL(totalPago)}</div>
              </div>
              <div style={{background:"#fce4ec",borderRadius:12,padding:16,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:800,color:"#c62828"}}>{clientes.filter(c=>c.ativo&&!pagamentos[c.id]).length}</div>
                <div style={{fontSize:13,color:"#555"}}>Pendentes</div>
                <div style={{fontWeight:700,color:"#c62828"}}>{formatBRL(totalPend)}</div>
              </div>
            </div>
            {GRUPOS.map(gr=>{
              const pagos=clientes.filter(c=>c.grupo===gr.id&&pagamentos[c.id]);
              const pend=clientes.filter(c=>c.grupo===gr.id&&c.ativo&&!pagamentos[c.id]);
              return (
                <div key={gr.id} style={{...cardStyle,borderLeft:`4px solid ${gr.cor}`}}>
                  <div style={{fontWeight:700,color:gr.cor,marginBottom:8}}>{gr.label}</div>
                  {pagos.map(cl=>(
                    <div key={cl.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #f0f0f0"}}>
                      <span>✅ {cl.nome}</span>
                      <span style={{fontSize:12,color:"#888"}}>Parcela {cl.parcelaAtual}/{cl.totalParcelas}</span>
                      <span style={{color:"#2e7d32",fontWeight:600}}>{formatBRL(cl.valor)}</span>
                    </div>
                  ))}
                  {pend.map(cl=>(
                    <div key={cl.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:"1px solid #f0f0f0"}}>
                      <span>⏳ {cl.nome}</span>
                      <span style={{fontSize:12,color:"#888"}}>Parcela {cl.parcelaAtual}/{cl.totalParcelas}</span>
                      <span style={{color:"#c62828",fontWeight:600}}>{formatBRL(cl.valor)}</span>
                    </div>
                  ))}
                  {!pagos.length&&!pend.length&&<div style={{color:"#aaa",fontSize:13}}>Nenhum cliente.</div>}
                </div>
              );
            })}
            <div style={{...cardStyle,background:"#e3f2fd"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontWeight:700}}>Total esperado</span>
                <span style={{fontWeight:700}}>{formatBRL(clientes.filter(c=>c.ativo).reduce((s,c)=>s+c.valor,0))}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,color:"#2e7d32"}}>Total recebido</span>
                <span style={{fontWeight:700,color:"#2e7d32"}}>{formatBRL(totalPago)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADD/EDIT */}
      {modal==="add" && (
        <div style={overlayStyle}>
          <div style={{...modalStyle,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:14}}>{editId?"Editar Cliente":"Novo Cliente"}</div>
            <label style={labelStyle}>Nome</label>
            <input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome completo" style={inputStyle}/>
            <label style={labelStyle}>WhatsApp</label>
            <input value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:formatPhone(e.target.value)}))} placeholder="(11) 99999-9999" style={inputStyle}/>
            <label style={labelStyle}>Valor da parcela (R$)</label>
            <input type="number" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))} placeholder="0,00" style={inputStyle}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <label style={labelStyle}>Total de parcelas</label>
                <input type="number" min={1} value={form.totalParcelas} onChange={e=>setForm(f=>({...f,totalParcelas:e.target.value}))} style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Parcela atual</label>
                <input type="number" min={1} value={form.parcelaAtual} onChange={e=>setForm(f=>({...f,parcelaAtual:e.target.value}))} style={inputStyle}/>
              </div>
            </div>
            <label style={labelStyle}>Grupo de horário</label>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {GRUPOS.map(gr=>(
                <button key={gr.id} onClick={()=>setForm(f=>({...f,grupo:gr.id}))} style={{
                  flex:1,padding:"8px",borderRadius:8,border:"2px solid",
                  borderColor:form.grupo===gr.id?gr.cor:"#ddd",
                  background:form.grupo===gr.id?gr.corBg:"#fff",
                  color:form.grupo===gr.id?gr.cor:"#777",
                  fontWeight:600,fontSize:12,cursor:"pointer"
                }}>{gr.label}</button>
              ))}
            </div>
            <div style={{fontWeight:700,marginBottom:4}}>Mensagens individuais</div>
            <div style={{fontSize:11,color:"#888",marginBottom:8}}>Deixe em branco para usar o padrão do grupo.</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[0,1,2].map(i=>(
                <button key={i} onClick={()=>setAvisoPreview(i)} style={{
                  flex:1,padding:"7px 4px",borderRadius:8,border:"2px solid",
                  borderColor:avisoPreview===i?"#1a73e8":"#ddd",
                  background:avisoPreview===i?"#e3f2fd":"#fff",
                  color:avisoPreview===i?"#1a73e8":"#555",
                  fontWeight:600,fontSize:12,cursor:"pointer"
                }}>{AVISO_ICONS[i]} {AVISO_LABELS[i]}</button>
              ))}
            </div>
            <textarea key={avisoPreview} value={form.mensagens[avisoPreview]}
              onChange={e=>{const m=[...form.mensagens];m[avisoPreview]=e.target.value;setForm(f=>({...f,mensagens:m}));}}
              placeholder={msgGrupo[form.grupo]?.[avisoPreview]||"Mensagem do grupo será usada"}
              rows={3} style={{...inputStyle,resize:"vertical",fontFamily:"sans-serif"}}/>
            <div style={{background:"#f0f7ff",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:12,color:"#333",whiteSpace:"pre-line"}}>
              <b>Preview:</b>{"\n"}{applyVars(form.mensagens[avisoPreview]||msgGrupo[form.grupo]?.[avisoPreview]||"",{nome:form.nome||"Cliente",valor:form.valor||0,parcelaAtual:form.parcelaAtual||1,totalParcelas:form.totalParcelas||1})}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setModal(null);setEditId(null);}} style={{...btnStyle("#757575"),flex:1}}>Cancelar</button>
              <button onClick={salvarCliente} style={{...btnStyle("#1a73e8"),flex:1}}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RENOVAR */}
      {modal==="renovar" && renovarCliente && (
        <div style={overlayStyle}>
          <div style={{...modalStyle,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:36}}>🏆</div>
              <div style={{fontWeight:800,fontSize:18,color:"#2e7d32"}}>{renovarCliente.nome} quitou!</div>
              <div style={{fontSize:13,color:"#666",marginTop:4}}>Deseja renovar o empréstimo?</div>
            </div>

            <label style={labelStyle}>Valor do empréstimo</label>
            <div style={{display:"flex",gap:8,marginBottom:12}}>
              {VALORES_RENOVACAO.map(v=>(
                <button key={v} onClick={()=>setRenovForm(f=>({...f,valorEmprestimo:v}))} style={{
                  flex:1,padding:"10px 4px",borderRadius:8,border:"2px solid",
                  borderColor:renovForm.valorEmprestimo===v?"#1a73e8":"#ddd",
                  background:renovForm.valorEmprestimo===v?"#e3f2fd":"#fff",
                  color:renovForm.valorEmprestimo===v?"#1a73e8":"#555",
                  fontWeight:700,fontSize:14,cursor:"pointer"
                }}>{formatBRL(v)}</button>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:4}}>
              <div>
                <label style={labelStyle}>Valor da parcela (R$)</label>
                <input type="number" value={renovForm.valor} onChange={e=>setRenovForm(f=>({...f,valor:e.target.value}))} placeholder="Ex: 50" style={inputStyle}/>
              </div>
              <div>
                <label style={labelStyle}>Total de parcelas</label>
                <input type="number" min={1} value={renovForm.totalParcelas} onChange={e=>setRenovForm(f=>({...f,totalParcelas:e.target.value}))} style={inputStyle}/>
              </div>
            </div>

            {renovForm.valor && renovForm.totalParcelas && (
              <div style={{background:"#f0f7ff",borderRadius:8,padding:"10px 12px",marginBottom:14,fontSize:13,color:"#333"}}>
                💡 {renovForm.totalParcelas}x de {formatBRL(renovForm.valor)} = <b>{formatBRL(renovForm.valor*renovForm.totalParcelas)}</b> total
                {renovForm.valor*renovForm.totalParcelas > renovForm.valorEmprestimo && (
                  <span style={{color:"#2e7d32"}}> (+{formatBRL(renovForm.valor*renovForm.totalParcelas-renovForm.valorEmprestimo)} juros)</span>
                )}
              </div>
            )}

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setModal(null);setRenovarCliente(null);}} style={{...btnStyle("#757575"),flex:1}}>Agora não</button>
              <button onClick={confirmarRenovacao} style={{...btnStyle("#1a73e8"),flex:1}}>🔄 Renovar</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {confirmDelete && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:12}}>Excluir cliente?</div>
            <div style={{color:"#555",marginBottom:16}}>Esta ação não pode ser desfeita.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmDelete(null)} style={{...btnStyle("#757575"),flex:1}}>Cancelar</button>
              <button onClick={()=>excluir(confirmDelete)} style={{...btnStyle("#c62828"),flex:1}}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",
          background:toast.tipo==="erro"?"#c62828":"#323232",
          color:"#fff",padding:"12px 24px",borderRadius:24,fontSize:14,fontWeight:500,
          boxShadow:"0 4px 12px #0004",zIndex:9999,whiteSpace:"nowrap"}}>{toast.msg}</div>
      )}
    </div>
  );
}

const cardStyle={background:"#fff",borderRadius:12,padding:14,marginBottom:12,boxShadow:"0 1px 4px #0001"};
const emptyStyle={textAlign:"center",color:"#aaa",padding:"32px 0",fontSize:14};
const badgeStyle={fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:20};
const overlayStyle={position:"fixed",inset:0,background:"#0005",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20};
const modalStyle={background:"#fff",borderRadius:16,padding:24,width:"100%",maxWidth:420,boxShadow:"0 8px 32px #0003"};
const inputStyle={width:"100%",padding:"10px 12px",border:"1.5px solid #ddd",borderRadius:8,fontSize:14,marginBottom:10,boxSizing:"border-box"};
const labelStyle={fontSize:13,fontWeight:600,color:"#333",display:"block",marginBottom:4};
function btnStyle(bg){return{background:bg,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontWeight:600,fontSize:14,cursor:"pointer"};}
function btnSmall(bg){return{background:bg,color:"#fff",border:"none",borderRadius:6,padding:"6px 11px",fontWeight:600,fontSize:12,cursor:"pointer"};}