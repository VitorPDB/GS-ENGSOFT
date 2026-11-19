import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {randomUUID} from 'expo-crypto';
import type {Dashboard,RiskAlert,RiskType} from './types';
import {labels} from './types';
import {isStale} from './sync';
import {theme as t,riskColors} from './theme';
import {Icon,IconName} from './Icon';
import {PageIntro,SeverityBadge} from './Presentation';
import {CommunityReport,createReport,districts,listReports,ReportStatus,reportLabels,ReportInputError,updateReport} from './community';

export type FeatureRoute='Painel'|'Notificações'|'Relatos'|'Novo relato'|'Acompanhamento'|'Detalhe alerta'|'Origem e confiança';
interface Props {
  route:FeatureRoute|null;url:string;clientId:string|null;online:boolean;
  data?:Dashboard;savedAt?:string;now:number;alert:RiskAlert|null;
  onNavigate:(route:FeatureRoute|'Feed')=>void;onOpenAlert:(alert:RiskAlert)=>void;onBackAlert:()=>void;
}
const percentage=(n:number)=>Math.round(n*100)+'%';
const date=(value:string)=>new Date(value).toLocaleString('pt-BR');
function Action({label,onPress,disabled=false,primary=false,icon,warning=false,text}:{label:string;onPress:()=>void;disabled?:boolean;primary?:boolean;icon?:IconName;warning?:boolean;text?:string}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled}
    onPress={onPress} style={({pressed})=>[s.action,primary&&s.primary,warning&&s.warningAction,pressed&&s.pressed,disabled&&{opacity:.45}]}>
    {!!icon&&<Icon name={icon} color={primary?t.onPrimary:warning?t.warning:t.primary} size={20}/>}
    <Text style={[s.actionText,primary&&{color:t.onPrimary},warning&&{color:t.warning}]}>{text||label}</Text>
    <Icon name="arrow-right" color={primary?t.onPrimary:warning?t.warning:t.primary} size={18}/>
  </Pressable>;
}
function Heading({title,subtitle,icon,featured=false}:{title:string;subtitle?:string;icon?:IconName;featured?:boolean}) {
  return <PageIntro title={title} subtitle={subtitle} icon={icon} featured={featured}/>;
}
function Fact({label,value}:{label:string;value:string}) {
  return <View style={s.fact}><Text style={[s.secondary,s.factLabel]}>{label}</Text><Text style={s.factValue}>{value}</Text></View>;
}
function FieldHeading({step,title,icon}:{step:string;title:string;icon:IconName}) {
  return <View style={s.fieldHeading}><View style={s.fieldStep}><Text style={s.fieldStepText}>{step}</Text></View><Text accessibilityRole="header" style={[s.sectionTitle,{flex:1}]}>{title}</Text><Icon name={icon} size={20} color={t.primary}/></View>;
}
export function FeatureScreens(p:Props) {
  const [reports,setReports]=useState<CommunityReport[]>([]);
  const [selectedId,setSelectedId]=useState<number|null>(null);
  const [loading,setLoading]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [error,setError]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [type,setType]=useState<RiskType>('FLOOD');
  const [district,setDistrict]=useState<string>(districts[0]);
  const [description,setDescription]=useState('');
  const requestId=useRef<string|null>(null);
  const pendingPayload=useRef<{requestId:string;type:RiskType;district:string;description:string}|null>(null);
  const inFlight=useRef(false);
  const [read,setRead]=useState<string[]>([]);
  const [readReady,setReadReady]=useState(false);
  const [readWarning,setReadWarning]=useState('');
  const readKey='urip:notifications:v1:'+p.url+':'+(p.clientId||'public');
  useEffect(()=>{
    let alive=true;setRead([]);setReadReady(false);setReadWarning('');
    AsyncStorage.getItem(readKey).then(value=>{
      if(!alive)return;
      const parsed:unknown=value?JSON.parse(value):[];
      setRead(Array.isArray(parsed)?parsed.filter((v):v is string=>typeof v==='string').slice(-500):[]);
    }).catch(()=>{if(alive)setReadWarning('Não foi possível recuperar as marcações de leitura deste dispositivo.');})
      .finally(()=>{if(alive)setReadReady(true);});
    return()=>{alive=false;};
  },[readKey]);
  const markRead=async(alert:RiskAlert)=>{
    if(!readReady)return;
    const key=alert.id+':'+alert.severity;
    const next=[...read.filter(k=>k!==key),key].slice(-500);
    setRead(next);
    try {await AsyncStorage.setItem(readKey,JSON.stringify(next));}
    catch {setReadWarning('A marcação vale nesta sessão; não foi possível salvá-la no dispositivo.');}
  };
  const load=async()=>{
    if(!p.clientId||!p.online||inFlight.current)return;
    inFlight.current=true;setLoading(true);setError('');
    try {setReports(await listReports(p.url,p.clientId));}
    catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os relatos.');}
    finally{inFlight.current=false;setLoading(false);}
  };
  useEffect(()=>{if(p.route==='Relatos'||p.route==='Acompanhamento')void load();},[p.route,p.online,p.clientId,p.url]);
  const navigate=(route:FeatureRoute|'Feed')=>{setError('');setConfirmation('');p.onNavigate(route);};
  const openReport=(r:CommunityReport)=>{setSelectedId(r.id);navigate('Acompanhamento');};
  const canSubmit=p.online&&!!p.clientId&&!submitting&&!loading;
  const submit=async()=>{
    if(!canSubmit||inFlight.current)return;
    const text=description.trim();
    if(text.length<10||text.length>500){setError('Descreva a ocorrência com 10 a 500 caracteres.');return;}
    inFlight.current=true;setSubmitting(true);setError('');
    try {
      if(!pendingPayload.current) {
        requestId.current=requestId.current||randomUUID();
        pendingPayload.current={requestId:requestId.current,type,district,description:text};
      }
      const r=await createReport(p.url,p.clientId!,pendingPayload.current);
      setReports(previous=>[r,...previous.filter(item=>item.id!==r.id)]);
      setSelectedId(r.id);setDescription('');requestId.current=null;pendingPayload.current=null;
      setConfirmation('Relato registrado. Ele ainda não foi validado oficialmente.');
      p.onNavigate('Acompanhamento');
    } catch(e){
      if(e instanceof ReportInputError){pendingPayload.current=null;requestId.current=null;}
      setError(e instanceof Error?e.message:'Não foi possível enviar. Seu rascunho foi mantido.');
    }
    finally{inFlight.current=false;setSubmitting(false);}
  };
  const changeStatus=async(next:ReportStatus)=>{
    if(!canSubmit||selectedId===null||inFlight.current)return;
    inFlight.current=true;setSubmitting(true);setError('');
    try {
      const updated=await updateReport(p.url,p.clientId!,selectedId,next);
      setReports(previous=>previous.map(r=>r.id===updated.id?updated:r));
      setConfirmation('Situação atualizada pelo autor do relato.');
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível atualizar a situação.');}
    finally{inFlight.current=false;setSubmitting(false);}
  };
  if(!p.route)return null;
  const current=reports.find(r=>r.id===selectedId);
  const alert=p.alert;
  const stale=(a:RiskAlert)=>!p.data||!p.savedAt||isStale(a,p.data.serverTime,p.savedAt,p.now);
  const currentAlerts=p.data?.alerts||[];
  const notifications=currentAlerts.filter(a=>a.severity==='Alto'||a.severity==='Crítico');
  const editable=!submitting&&!pendingPayload.current;
  const backLabel=p.route==='Detalhe alerta'?'Voltar à lista de origem':p.route==='Origem e confiança'?'Voltar ao alerta':p.route==='Novo relato'||p.route==='Acompanhamento'?'Voltar aos meus relatos':'Voltar aos alertas';
  return <View style={s.screen}>
    <Pressable accessibilityRole="button" accessibilityLabel={backLabel} style={({pressed})=>[s.back,pressed&&s.pressed]}
      onPress={()=>p.route==='Detalhe alerta'?p.onBackAlert():navigate(p.route==='Origem e confiança'?'Detalhe alerta':p.route==='Novo relato'||p.route==='Acompanhamento'?'Relatos':'Feed')}>
      <Icon name="arrow-left" size={20} color={t.primary}/><Text style={s.backText}>{backLabel}</Text>
    </Pressable>
    {!!error&&['Relatos','Novo relato','Acompanhamento'].includes(p.route)&&<Text accessibilityRole="alert" style={s.message}>{error}</Text>}
    {!!confirmation&&p.route==='Acompanhamento'&&<Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.message,s.confirmation]}>{confirmation}</Text>}
    {p.route==='Painel'&&<>
      <Heading title="Panorama urbano" subtitle="Veja quais bairros precisam de atenção e abra uma ocorrência para entender o risco." icon="view-dashboard-outline" featured/>
      {!p.data?<Text style={s.body}>Nenhuma leitura disponível. Conecte-se para carregar o panorama.</Text>:<>
        <View style={s.summaryStrip}>
          <View style={s.summaryItem}><Text style={s.summaryValue}>{currentAlerts.length}</Text><Text style={s.summaryLabel}>Acompanhadas</Text></View>
          <View style={s.summaryItem}><Text style={[s.summaryValue,{color:t.warning}]}>{notifications.length}</Text><Text style={s.summaryLabel}>Em atenção</Text></View>
          <View style={s.summaryItem}><Text style={s.summaryValue}>{currentAlerts.filter(stale).length}</Text><Text style={s.summaryLabel}>Antigas</Text></View>
        </View>
        <Text style={s.secondary}>Em atenção: níveis alto ou crítico. Leituras com mais de 90 s aparecem como antigas.</Text>
        {(['FLOOD','HEAT','OUTAGE'] as RiskType[]).map(risk=><View key={risk} style={s.riskGroup}>
          <View style={[s.groupHeading,{backgroundColor:riskColors[risk].soft}]}><Icon name={riskColors[risk].icon} color={riskColors[risk].ink} size={23}/><Text accessibilityRole="header" style={[s.sectionTitle,{color:riskColors[risk].ink,flex:1}]}>{labels[risk]}</Text><Text style={[s.groupCount,{color:riskColors[risk].ink}]}>{currentAlerts.filter(a=>a.type===risk).length} bairros</Text></View>
          {currentAlerts.filter(a=>a.type===risk).map(a=><Pressable key={a.id} accessibilityRole="button"
            accessibilityLabel={'Acompanhar '+a.title+' em '+a.district} onPress={()=>p.onOpenAlert(a)} style={({pressed})=>[s.riskRow,pressed&&s.pressed]}>
            <View style={s.rowContent}><Text style={s.rowTitle}>{a.district}</Text>{stale(a)&&<Text style={s.staleText}>Leitura antiga</Text>}</View><SeverityBadge severity={a.severity}/><Icon name="chevron-right" color={t.secondary} size={20}/>
          </Pressable>)}
        </View>)}
        <Action label="Ver central de notificações" onPress={()=>navigate('Notificações')} icon="bell-outline" primary/>
      </>}
    </>}
    {p.route==='Detalhe alerta'&&<>
      <Heading title="Detalhe da ocorrência" subtitle={alert?alert.title+' · '+alert.district:'Ocorrência indisponível'} icon={alert?riskColors[alert.type].icon:'alert-circle-outline'}/>
      {alert?<>
        <View style={[s.measure,{backgroundColor:riskColors[alert.type].soft}]}><View style={s.measureTop}><SeverityBadge severity={alert.severity}/><Text style={s.secondary}>Prioridade {alert.score}/100</Text></View><Text style={[s.measureValue,{color:riskColors[alert.type].ink}]}>{alert.value.toLocaleString('pt-BR',{maximumFractionDigits:1})}<Text style={s.measureUnit}> {alert.unit}</Text></Text><Text style={s.secondary}>Última medição · {date(alert.observedAt)}</Text></View>
        {stale(alert)&&<Text accessibilityRole="alert" style={s.message}>Leitura antiga. Confirme a situação atual antes de agir.</Text>}
        <View style={s.advice}><View style={s.sectionHeading}><Icon name="shield-check-outline" size={21} color={t.primary}/><Text accessibilityRole="header" style={s.sectionTitle}>O que fazer</Text></View><Text style={s.body}>{alert.recommendation}</Text></View>
        <View style={s.section}><Text accessibilityRole="header" style={s.sectionTitle}>Como a prioridade foi calculada</Text><Text style={s.body}>{alert.explanation}</Text></View>
        <View style={s.facts}><Fact label="Origem" value={alert.sourceLabel}/><Fact label="Confiança" value={percentage(alert.confidence)}/></View>
        <Action label="Ver origem e confiança" onPress={()=>navigate('Origem e confiança')} icon="database-outline" primary/>
        <Action label="Registrar ocorrência comunitária" onPress={()=>navigate('Novo relato')} icon="message-plus-outline"/>
      </>:<Text style={s.body}>Volte ao feed e escolha uma ocorrência.</Text>}
    </>}
    {p.route==='Origem e confiança'&&<>
      <Heading title="Origem e confiança" subtitle={alert?alert.title+' · '+alert.district:undefined} icon="database-outline"/>
      {alert?<>
        <View style={s.facts}><Fact label="Categoria da fonte" value={alert.sourceLabel}/><Fact label="Base da fonte" value={percentage(alert.baseConfidence)}/>
        <Fact label="Likes / dislikes nas últimas 24 h" value={alert.likes+' / '+alert.dislikes}/>
        <Fact label="Confiança combinada" value={percentage(alert.confidence)}/></View>
        <View style={s.sectionHeading}><Icon name="calculator-variant-outline" size={21} color={t.primary}/><Text accessibilityRole="header" style={s.sectionTitle}>Como funciona</Text></View>
        <Text style={s.formula}>(base × 4 + likes) / (4 + likes + dislikes)</Text>
        <Text style={s.body}>{alert.confidenceExplanation}</Text>
        <Text style={s.body}>Sensor: base 90%. Base pública: 80%. Comunidade simulada: 55%. Reações não alteram a gravidade física nem a prioridade.</Text>
        <Text style={s.message}>Os dados são simulados. A confiança é um índice demonstrativo de origem e apoio comunitário; não é probabilidade, acurácia ou validação oficial.</Text>
        <Text style={s.secondary}>Votos são pseudônimos por instalação, risco e bairro. Apagar os dados ou usar outro dispositivo permite outra identidade; não há garantia de uma pessoa por voto.</Text>
      </>:<Text style={s.body}>Escolha uma ocorrência pelo feed.</Text>}
    </>}
    {p.route==='Notificações'&&<>
      <Heading title="Central de notificações" subtitle="Ocorrências altas e críticas nas últimas leituras disponíveis." icon="bell-outline"/>
      <Text style={s.secondary}>Esta central acompanha o estado atual, não um histórico de notificações. Avisos aparecem com o app aberto; não há push em segundo plano. A marcação de leitura é local a este dispositivo.</Text>
      {!!readWarning&&<Text accessibilityRole="alert" style={s.message}>{readWarning}</Text>}
      {!notifications.length&&<Text style={s.empty}>{p.data?'Nenhum alerta alto ou crítico nas últimas leituras.':'Conecte-se para carregar os alertas.'}</Text>}
      {notifications.map(a=>{
        const seen=read.includes(a.id+':'+a.severity);
        return <View key={a.id} style={[s.notification,!seen&&s.unreadNotification]}><View style={s.notificationTop}><SeverityBadge severity={a.severity}/><Text style={[s.readChip,!seen&&s.unreadChip]}>{seen?'Lido':'Não lido'}</Text></View>
          <Text style={s.sectionTitle}>{a.title} · {a.district}</Text><Text style={s.body}>{a.recommendation}</Text>
          <Text style={s.secondary}>{date(a.observedAt)} · {a.sourceLabel} · confiança {percentage(a.confidence)}</Text>
          {stale(a)&&<Text style={s.staleText}>Leitura antiga · confirme a situação atual</Text>}
          <Action label={'Abrir notificação de '+a.title+' em '+a.district} text="Abrir ocorrência" onPress={()=>{void markRead(a);p.onOpenAlert(a);}} icon="open-in-new" primary/>
          {!seen&&<Pressable accessibilityRole="button" accessibilityLabel={'Marcar como lida: '+a.title+' em '+a.district} accessibilityState={{disabled:!readReady}} disabled={!readReady} onPress={()=>void markRead(a)} style={({pressed})=>[s.readAction,pressed&&s.pressed]}><Icon name="check" size={19} color={t.primary}/><Text style={s.backText}>Marcar como lida</Text></Pressable>}
        </View>;
      })}
    </>}
    {p.route==='Relatos'&&<>
      <Heading title="Meus relatos" subtitle="Registre uma situação e acompanhe as atualizações que você informar." icon="message-text-outline" featured/>
      <Action label="Novo relato comunitário" onPress={()=>navigate('Novo relato')} icon="plus" primary/>
      <Text style={s.secondary}>Registros desta instalação, disponíveis para consulta por sete dias.</Text>
      <Text style={s.secondary}>Relatos comunitários não são confirmações oficiais e não alteram as medições ou a prioridade dos alertas. O identificador do dispositivo não substitui uma conta autenticada.</Text>
      <Action label="Atualizar meus relatos" onPress={()=>void load()} disabled={!canSubmit} icon="refresh"/>
      {!p.online&&<Text accessibilityRole="alert" style={s.message}>Consulta sem atualização. Reconecte-se para buscar ou alterar os relatos.</Text>}
      {!p.clientId&&<Text accessibilityRole="alert" style={s.message}>É necessário conseguir salvar o identificador deste dispositivo para registrar e consultar relatos.</Text>}
      {loading?<ActivityIndicator color={t.ink} accessibilityLabel="Carregando relatos"/>:!reports.length&&<Text style={s.empty}>{p.online?'Nenhum relato desta instalação.':'Nenhum relato disponível nesta sessão.'}</Text>}
      {reports.map(r=><Pressable key={r.id} accessibilityRole="button" accessibilityLabel={'Acompanhar relato '+r.id} onPress={()=>openReport(r)} style={({pressed})=>[s.reportRow,pressed&&s.pressed]}>
        <View style={s.sectionHeading}><View style={[s.riskIcon,{backgroundColor:riskColors[r.type].soft}]}><Icon name={riskColors[r.type].icon} color={riskColors[r.type].ink} size={21}/></View><View style={s.rowContent}><Text style={s.sectionTitle}>{labels[r.type]}</Text><Text style={s.secondary}>{r.district}</Text></View><Icon name="chevron-right" size={22} color={t.primary}/></View><Text style={s.body} numberOfLines={2}>{r.description}</Text>
        <View style={s.notificationTop}><Text style={s.reportStatus}>{reportLabels[r.status]}</Text><Text style={s.secondary}>{date(r.createdAt)}</Text></View>
      </Pressable>)}
    </>}
    {p.route==='Novo relato'&&<>
      <Heading title="Registrar ocorrência" subtitle="Escolha o risco, indique o bairro e descreva o que você observou." icon="message-plus-outline"/>
      <Text style={s.message}>Não inclua nomes, telefones, endereços exatos ou outros dados pessoais. Este formulário não aciona serviços de emergência e não confirma risco físico.</Text>
      <View style={s.formSection}><FieldHeading step="1" title="Tipo de risco" icon="shape-outline"/>
      <View style={s.options}>{(['FLOOD','HEAT','OUTAGE'] as RiskType[]).map(risk=><Pressable key={risk} accessibilityRole="radio"
        accessibilityLabel={labels[risk]} accessibilityState={{selected:type===risk,disabled:!editable}} disabled={!editable} onPress={()=>setType(risk)}
        style={({pressed})=>[s.option,type===risk&&s.selectedOption,pressed&&s.pressed,!editable&&{opacity:.55}]}><Icon name={riskColors[risk].icon} color={type===risk?t.primary:riskColors[risk].ink} size={21}/><Text style={[s.optionText,type===risk&&s.selectedOptionText]}>{labels[risk]}</Text><Icon name={type===risk?'radiobox-marked':'radiobox-blank'} color={type===risk?t.primary:t.secondary} size={20}/></Pressable>)}</View></View>
      <View style={s.formSection}><FieldHeading step="2" title="Bairro" icon="map-marker-outline"/>
      <View style={s.options}>{districts.map(item=><Pressable key={item} accessibilityRole="radio" accessibilityLabel={item}
        accessibilityState={{selected:district===item,disabled:!editable}} disabled={!editable} onPress={()=>setDistrict(item)}
        style={({pressed})=>[s.option,district===item&&s.selectedOption,pressed&&s.pressed,!editable&&{opacity:.55}]}><Text style={[s.optionText,district===item&&s.selectedOptionText]}>{item}</Text><Icon name={district===item?'radiobox-marked':'radiobox-blank'} color={district===item?t.primary:t.secondary} size={20}/></Pressable>)}</View><Text style={s.secondary}>Bairros fictícios usados nesta demonstração.</Text></View>
      <View style={s.formSection}><FieldHeading step="3" title="Descrição" icon="text-box-outline"/>
      <TextInput accessibilityLabel="Descrição da ocorrência" value={description} onChangeText={setDescription} multiline maxLength={500}
        editable={editable} placeholder="Ex.: água acumulada na área de passagem após chuva." placeholderTextColor={t.secondary} style={s.input}/>
      <Text style={s.secondary}>{description.trim().length}/500 caracteres · mínimo 10</Text></View>
      {!!pendingPayload.current&&<Text accessibilityRole="alert" style={s.message}>O envio anterior ainda não foi confirmado. Tente novamente para recuperar o mesmo registro sem duplicá-lo. Os campos ficam preservados até a confirmação.</Text>}
      {!p.online&&<Text accessibilityRole="alert" style={s.message}>Conecte-se para enviar. O rascunho permanece enquanto o app estiver aberto; não há fila de envio automático.</Text>}
      {!p.clientId&&<Text accessibilityRole="alert" style={s.message}>Registro indisponível: não foi possível salvar a identidade desta instalação.</Text>}
      <Action label={submitting?'Enviando relato…':'Enviar relato'} onPress={()=>void submit()} disabled={!canSubmit||description.trim().length<10} icon="send-outline" primary/>
    </>}
    {p.route==='Acompanhamento'&&<>
      <Heading title="Acompanhamento do relato" subtitle={current?'Registro #'+current.id:undefined} icon="timeline-text-outline"/>
      {loading&&<ActivityIndicator color={t.ink} accessibilityLabel="Atualizando relato"/>}
      {current?<>
        <View style={s.reportDetail}><View style={s.sectionHeading}><View style={[s.riskIcon,{backgroundColor:riskColors[current.type].soft}]}><Icon name={riskColors[current.type].icon} size={23} color={riskColors[current.type].ink}/></View><View style={s.rowContent}><Text accessibilityRole="header" style={s.sectionTitle}>{labels[current.type]}</Text><Text style={s.secondary}>{current.district}</Text></View></View><Text style={s.body}>{current.description}</Text><Text style={s.reportStatus}>{reportLabels[current.status]}</Text></View>
        <View style={s.facts}><Fact label="Registrado em" value={date(current.createdAt)}/><Fact label="Última alteração" value={date(current.updatedAt)}/></View>
        <Text style={s.message}>Informação fornecida pelo autor, sem validação oficial. Acompanhar ou encerrar este relato não altera os alertas calculados a partir das leituras.</Text>
        <View style={s.section}><Text accessibilityRole="header" style={s.sectionTitle}>Etapas do acompanhamento</Text>{(['REPORTADO','EM_MONITORAMENTO','ENCERRADO'] as ReportStatus[]).map((status,index)=><View key={status} style={[s.step,current.status===status&&s.activeStep]}>
          <View style={[s.stepDot,current.status===status&&s.activeStepDot]}><Icon name={status==='REPORTADO'?'message-text-outline':status==='EM_MONITORAMENTO'?'eye-outline':'check'} size={18} color={current.status===status?t.onPrimary:t.secondary}/></View><View style={s.rowContent}><Text style={[s.body,current.status===status&&s.currentStepText]}>{reportLabels[status]}</Text>{current.status===status&&<Text style={s.currentStepCaption}>Situação atual</Text>}</View><Text style={s.stepNumber}>{index+1}</Text>
        </View>)}{current.status==='DESCARTADO'&&<Text style={s.message}>Descartado pelo autor · estado final</Text>}</View>
        {current.status==='REPORTADO'&&<Action label="Iniciar acompanhamento" onPress={()=>void changeStatus('EM_MONITORAMENTO')} disabled={!canSubmit} icon="eye-outline" primary/>}
        {current.status==='EM_MONITORAMENTO'&&<Action label="Encerrar relato" onPress={()=>void changeStatus('ENCERRADO')} disabled={!canSubmit} icon="check-circle-outline" primary/>}
        {(current.status==='REPORTADO'||current.status==='EM_MONITORAMENTO')&&<Action label="Descartar relato" onPress={()=>void changeStatus('DESCARTADO')} disabled={!canSubmit} icon="archive-outline" warning/>}
        {(current.status==='ENCERRADO'||current.status==='DESCARTADO')&&<Text style={s.secondary}>Este relato está finalizado e não pode ser reaberto.</Text>}
        {!p.online&&<Text accessibilityRole="alert" style={s.message}>Reconecte-se para atualizar a situação.</Text>}
      </>:!loading&&<Text style={s.empty}>O relato não está disponível. Ele pode ter expirado após sete dias. Volte à lista para atualizar.</Text>}
    </>}
    <View style={s.footer}><Icon name="flask-outline" size={18}/><Text style={[s.secondary,{flex:1}]}>Demonstração acadêmica. Dados simulados e relatos sem validação oficial.</Text></View>
  </View>;
}
const s=StyleSheet.create({
  screen:{gap:20,paddingBottom:28},
  secondary:{fontSize:13,lineHeight:21,color:t.secondary},body:{fontSize:14,lineHeight:23,color:t.ink},
  sectionTitle:{fontSize:17,lineHeight:25,fontWeight:'700',color:t.ink},
  section:{borderTopWidth:1,borderColor:t.line,paddingTop:24,gap:14},sectionHeading:{flexDirection:'row',alignItems:'center',gap:10},
  back:{alignSelf:'flex-start',minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,paddingRight:12,borderRadius:8},
  backText:{fontSize:13,lineHeight:21,fontWeight:'600',color:t.primary,flexShrink:1},pressed:{opacity:.72},
  summaryStrip:{flexDirection:'row',flexWrap:'wrap',gap:12,paddingVertical:20,borderBottomWidth:1,borderColor:t.line},
  summaryItem:{flex:1,minWidth:64,gap:5},summaryValue:{fontSize:30,lineHeight:38,fontWeight:'700',color:t.ink},summaryLabel:{fontSize:12,lineHeight:19,color:t.secondary},
  riskGroup:{borderWidth:1,borderColor:t.line,borderRadius:14,overflow:'hidden',backgroundColor:t.paper},
  groupHeading:{minHeight:64,padding:16,flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'},groupCount:{fontSize:12,lineHeight:20,fontWeight:'600'},
  riskRow:{minHeight:76,flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10,padding:16,borderTopWidth:1,borderColor:t.line},
  rowContent:{flex:1,minWidth:72,gap:4},rowTitle:{fontSize:14,lineHeight:22,fontWeight:'600',color:t.ink},staleText:{fontSize:12,lineHeight:20,color:t.warning},
  facts:{borderTopWidth:1,borderColor:t.line},fact:{paddingVertical:15,borderBottomWidth:1,borderColor:t.line,gap:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'},
  factLabel:{flexBasis:104,flexGrow:1},factValue:{flexBasis:120,flexGrow:1,minWidth:0,textAlign:'right',fontSize:15,lineHeight:23,color:t.ink,fontWeight:'600'},
  measure:{padding:22,gap:15,borderRadius:16},measureTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10},
  measureValue:{fontSize:48,lineHeight:60,fontWeight:'600',color:t.ink},measureUnit:{fontSize:21,lineHeight:30,fontWeight:'500'},
  advice:{padding:18,gap:12,borderRadius:14,backgroundColor:t.primarySoft},formula:{padding:18,borderRadius:12,backgroundColor:t.infoSoft,fontSize:15,lineHeight:25,fontWeight:'600',color:t.info},
  action:{minHeight:50,paddingHorizontal:16,paddingVertical:13,flexDirection:'row',alignItems:'center',gap:10,borderRadius:10,borderWidth:1,borderColor:t.line,backgroundColor:t.paper,alignSelf:'stretch'},
  actionText:{flex:1,fontSize:14,lineHeight:22,fontWeight:'600',color:t.primary},primary:{backgroundColor:t.primary,borderColor:t.primary},warningAction:{borderColor:t.line,backgroundColor:t.paper},
  message:{backgroundColor:t.warningSoft,padding:15,borderRadius:12,fontSize:13,lineHeight:21,color:t.warning},confirmation:{backgroundColor:t.primarySoft,color:t.primary},
  empty:{fontSize:14,lineHeight:23,color:t.secondary,paddingVertical:26},
  notification:{borderWidth:1,borderColor:t.line,borderRadius:14,padding:18,gap:14,backgroundColor:t.paper},unreadNotification:{backgroundColor:'#F8FCFA'},
  notificationTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'},
  readChip:{fontSize:11,lineHeight:18,fontWeight:'600',color:t.secondary,backgroundColor:t.canvas,borderRadius:6,paddingVertical:5,paddingHorizontal:8},unreadChip:{backgroundColor:t.primarySoft,color:t.primary},
  readAction:{alignSelf:'flex-start',minHeight:48,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:4},
  reportRow:{borderWidth:1,borderColor:t.line,borderRadius:14,padding:18,gap:14,backgroundColor:t.paper},
  reportStatus:{alignSelf:'flex-start',backgroundColor:t.primarySoft,color:t.primary,fontSize:12,lineHeight:20,fontWeight:'600',paddingHorizontal:9,paddingVertical:5,borderRadius:7},
  riskIcon:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center'},reportDetail:{padding:20,gap:18,borderRadius:14,borderWidth:1,borderColor:t.line,backgroundColor:t.paper},
  formSection:{borderTopWidth:1,borderColor:t.line,paddingTop:24,gap:14},fieldHeading:{flexDirection:'row',alignItems:'center',gap:10},
  fieldStep:{width:28,height:28,borderRadius:14,backgroundColor:t.primarySoft,justifyContent:'center',alignItems:'center'},fieldStepText:{fontSize:13,fontWeight:'700',color:t.primary},
  options:{flexDirection:'row',flexWrap:'wrap',gap:9},
  option:{minHeight:52,paddingHorizontal:13,paddingVertical:12,borderWidth:1,borderColor:t.line,borderRadius:10,flexDirection:'row',alignItems:'center',gap:8,flexGrow:1,flexBasis:170,backgroundColor:t.paper},
  optionText:{flex:1,fontSize:14,lineHeight:23,color:t.ink},selectedOption:{backgroundColor:t.primarySoft,borderColor:t.primary},selectedOptionText:{fontWeight:'600',color:t.primary},
  input:{borderWidth:1,borderColor:t.outline,borderRadius:12,minHeight:148,padding:15,fontSize:14,lineHeight:23,color:t.ink,backgroundColor:t.paper,textAlignVertical:'top'},
  step:{flexDirection:'row',alignItems:'center',gap:12,minHeight:64,paddingVertical:10,paddingHorizontal:12,borderRadius:10},activeStep:{backgroundColor:t.primarySoft},
  stepDot:{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:t.canvas},activeStepDot:{backgroundColor:t.primary},
  stepNumber:{fontSize:13,lineHeight:20,color:t.secondary},currentStepText:{fontWeight:'700',color:t.primary},currentStepCaption:{fontSize:12,lineHeight:20,color:t.primary},
  footer:{borderTopWidth:1,borderColor:t.line,marginTop:12,paddingTop:22,flexDirection:'row',alignItems:'flex-start',gap:10},
});
