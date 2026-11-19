import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMonitoring } from './src/useMonitoring';
import { theme as t, riskColors } from './src/theme';
import { RiskAlert, RiskType, labels } from './src/types';
import { AlertRow } from './src/AlertRow';
import { Icon,IconName } from './src/Icon';
import { FeedFilters, Filter } from './src/FeedFilters';
import { FeatureScreens, FeatureRoute } from './src/FeatureScreens';
import { PageIntro } from './src/Presentation';

type Tab='Painel'|'Feed'|'Notificações'|'Relatos'|'Atividade';
const primaryTabs:Tab[]=['Painel','Feed','Notificações','Relatos','Atividade'];
const destinations:Record<Tab,{label:string;description:string;icon:IconName}>={
  Painel:{label:'Painel',description:'Visão geral dos bairros',icon:'view-dashboard-outline'},
  Feed:{label:'Alertas',description:'Ocorrências por prioridade',icon:'layers-outline'},
  Notificações:{label:'Avisos',description:'Altos e críticos em atenção',icon:'bell-outline'},
  Relatos:{label:'Relatos',description:'Registre e acompanhe',icon:'message-text-outline'},
  Atividade:{label:'Histórico',description:'Últimas leituras recebidas',icon:'history'},
};
function Screen() {
  const width=useWindowDimensions().width;
  const wide=width>=900;
  const [tab,setTab]=useState<Tab>('Feed');
  const [featureRoute,setFeatureRoute]=useState<FeatureRoute|null>(null);
  const [selectedAlert,setSelectedAlert]=useState<RiskAlert|null>(null);
  const alertOrigin=useRef<Tab>('Feed');
  const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
  const navigate=(route:FeatureRoute|Tab)=>{
    if(primaryTabs.includes(route as Tab)){setTab(route as Tab);setFeatureRoute(null);}
    else setFeatureRoute(route as FeatureRoute);
    scroll.current?.scrollTo({y:0,animated:false});
  };
  const openAlert=(alert:RiskAlert)=>{alertOrigin.current=tab;setSelectedAlert(alert);navigate('Detalhe alerta');};
  useEffect(()=>{
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{
      if(featureRoute==='Origem e confiança'){navigate('Detalhe alerta');return true;}
      if(featureRoute==='Detalhe alerta'){navigate(alertOrigin.current);return true;}
      if(featureRoute==='Novo relato'||featureRoute==='Acompanhamento'){navigate('Relatos');return true;}
      if(tab!=='Feed'||featureRoute){navigate('Feed');return true;}
      return false;
    });
    return()=>subscription.remove();
  },[featureRoute,tab]);
  const activeFeature=featureRoute||(tab==='Feed'||tab==='Atividade'?null:tab);
  const showAside=width>=1280&&!activeFeature;
  const [filter,setFilter]=useState<Filter>('ALL');
  const [now,setNow]=useState(Date.now());
  const [about,setAbout]=useState(false);
  const [overview,setOverview]=useState(false);
  const m=useMonitoring();
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(timer);},[]);
  const data=m.snapshot?.data;
  const alerts=data?.alerts.filter(a=>filter==='ALL'||a.type===filter)||[];
  const lastSync=m.snapshot?new Date(m.snapshot.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'aguardando';
  const status=<View style={[s.status,m.status==='offline'&&s.offlineStatus]}><View style={[s.statusDot,m.status==='offline'&&s.offlineDot]}/><Text accessibilityLiveRegion="polite" style={s.small}>{m.status==='online'?'Conectado':m.status==='loading'?'Conectando':'Sem conexão'}</Text></View>;
  const refresh=<Pressable accessibilityRole="button" accessibilityLabel="Atualizar" accessibilityState={{disabled:m.busy||m.votingId!==null}} disabled={m.busy||m.votingId!==null}
    onPress={()=>void m.refresh()} style={({pressed})=>[s.refresh,pressed&&{backgroundColor:t.stone},m.busy&&{opacity:.5}]}><Icon name="refresh" size={23}/></Pressable>;
  const tabButtons=(rail:boolean)=>primaryTabs.map(item=>{
    const selected=tab===item;const destination=destinations[item];
    return <Pressable key={item} accessibilityRole="tab" accessibilityLabel={destination.label}
      accessibilityState={{selected}} onPress={()=>navigate(item)}
      style={({pressed})=>[rail?s.railTab:s.mobileTab,selected&&(rail?s.selectedRail:s.selectedTab),pressed&&{backgroundColor:t.primarySoft}]}>
      <View style={[s.navIcon,selected&&s.selectedIcon]}><Icon name={destination.icon} size={23} color={selected?t.primary:t.secondary}/></View>
      <View style={rail?s.navCopy:s.mobileNavCopy}><Text style={[s.tabText,!rail&&s.mobileTabText,selected&&{fontWeight:'700',color:t.primary}]}>{destination.label}</Text>
      {rail&&<Text style={s.navDescription}>{destination.description}</Text>}</View>
    </Pressable>;
  });
  const tabs=(rail:boolean)=><View accessibilityRole="tablist" style={rail?s.railTabs:s.mobileTabs}>{tabButtons(rail)}</View>;
  const panorama=<View style={s.panorama}><Text accessibilityRole="header" style={s.asideTitle}>Panorama</Text><Text style={s.asideBody}>Níveis altos ou críticos, por risco.</Text>
              {(['FLOOD','HEAT','OUTAGE'] as RiskType[]).map(type=>{const items=data?.alerts.filter(a=>a.type===type)||[];return <View key={type} style={s.panoramaRow}><Icon name={riskColors[type].icon} size={18} color={riskColors[type].ink}/><Text style={s.panoramaLabel}>{labels[type]}</Text><Text style={s.panoramaValue}>{data?`${items.filter(a=>a.score>=60).length} / ${items.length}`:'—'}</Text></View>;})}
              <Text style={s.footnote}>Com base nas últimas leituras salvas.{ '\n' }Leituras com mais de 90 s são sinalizadas.</Text>
            </View>;
  const provenance=<View style={s.provenance}>
    <Text style={s.asideTitle}>Informação com contexto.</Text>
    <Text style={s.asideBody}>Leituras de sensores, bases públicas e comunidade — todas simuladas nesta demonstração.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Sobre a análise" accessibilityState={{expanded:about}} onPress={()=>setAbout(!about)} style={s.aboutButton}><Text style={s.link}>Sobre a análise</Text><Icon name={about?'chevron-up':'arrow-top-right'} size={17}/></Pressable>
    {about&&<Text style={s.asideBody}>A prioridade considera intensidade e tendência. A confiança combina a base da fonte com likes e dislikes das últimas 24 horas. Não representa probabilidade de ocorrência. Abra uma publicação para ver a conta completa. Os avisos aparecem com o app aberto.</Text>}
    <Text style={s.footnote}>Sem nome ou localização do aparelho. Um identificador aleatório fica salvo neste dispositivo para registrar seus votos.</Text>
    <Text style={s.footnote}>Sincronizado às {lastSync}{m.latency!==null?` · ${m.latency} ms`:''}{'\n'}Urban Risk Intelligence Platform</Text>
  </View>;

  return <SafeAreaView style={s.safe}><StatusBar style="dark"/><View style={s.shell}>
    {wide&&<View style={s.rail}>
      <View style={s.brandBlock}><Text style={s.brand}>URIP</Text><Text style={s.fullName}>Urban Risk{ '\n' }Intelligence Platform</Text></View>
      {tabs(true)}
      <Pressable accessibilityRole="button" accessibilityLabel="Novo relato" onPress={()=>navigate('Novo relato')} style={s.railCreate}><Icon name="plus" size={20} color={t.onPrimary}/><Text style={s.createText}>Novo relato</Text></Pressable>
      <View style={s.railFooter}><Text style={s.footnote}>Monitoramento urbano{ '\n' }Projeto acadêmico</Text></View>
    </View>}
    <View style={s.workspace}>
      <View style={s.topbar}>
        {wide?<View style={s.topIdentity}><Text style={s.topTitle}>{featureRoute||destinations[tab].label}</Text><Text style={s.topDescription}>Urban Risk Intelligence Platform</Text></View>:<View style={s.topIdentity}><Text style={s.mobileBrand}>URIP</Text><Text style={s.mobileFullName}>{featureRoute||destinations[tab].description}</Text></View>}
        <View style={s.topActions}>{status}{refresh}</View>
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.scrollContent,wide&&s.scrollWide]}>
        <View style={[s.columns,showAside&&{gap:32}]}>
          <View style={s.feed}>
            {!activeFeature&&<View style={s.feedIntro}><PageIntro title={tab==='Feed'?'Seu radar urbano.':'Cada leitura conta.'} subtitle={tab==='Feed'?'Entenda o risco, confira a origem e acompanhe seu bairro.':'Consulte as medições mais recentes, com horário e origem.'} icon={tab==='Feed'?'layers-outline':'history'} featured={tab==='Feed'}/><View style={s.introMeta}><Text style={s.introText}>{tab==='Feed'?(data?`${data.alerts.length} ocorrências · por prioridade`:'Aguardando as primeiras leituras'):'Histórico com horário e origem.'}</Text>{!wide&&tab==='Feed'&&<Pressable accessibilityRole="button" accessibilityLabel="Novo relato" onPress={()=>navigate('Novo relato')} style={s.quickCreate}><Icon name="plus-circle-outline" size={18} color={t.primary}/><Text style={s.link}>Novo relato</Text></Pressable>}</View></View>}
            <View style={s.simulation}><Icon name="flask-outline" size={17}/><Text style={s.simulationText}>Dados simulados. Não são alertas oficiais.</Text></View>
            {!showAside&&!activeFeature&&<View style={s.compactOverview}><Pressable accessibilityRole="button" accessibilityLabel="Panorama" accessibilityState={{expanded:overview}} onPress={()=>setOverview(!overview)} style={s.overviewToggle}><Icon name="view-dashboard-outline" size={20} color={t.primary}/><Text style={s.sectionLabel}>Panorama</Text><Text style={s.overviewCount}>{data?`${data.alerts.filter(a=>a.score>=60).length} em atenção`:'Aguardando dados'}</Text><Icon name={overview?'chevron-up':'chevron-down'} size={20}/></Pressable>{overview&&panorama}</View>}
            {m.status==='offline'&&<View accessibilityRole="alert" style={s.notice}>
              <Text style={s.noticeTitle}>Atualizações pausadas</Text><Text style={s.body}>{data?'Você está vendo os últimos dados salvos. A situação pode ter mudado.':'Ainda não há dados salvos. As ocorrências aparecerão quando o serviço estiver disponível.'} Tentaremos novamente a cada 5 segundos. Conecte-se para votar.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Tentar agora" disabled={m.busy||m.votingId!==null} accessibilityState={{disabled:m.busy||m.votingId!==null}} onPress={()=>void m.refresh()} style={s.noticeAction}><Text style={s.link}>Tentar agora</Text><Icon name="arrow-right" size={18}/></Pressable>
            </View>}
            {!!m.storageWarning&&<Text accessibilityRole="alert" style={s.warning}>{m.storageWarning}</Text>}
            {!!m.notice&&<View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={s.notice}><Text style={s.body}>{m.notice}</Text><Pressable accessibilityRole="button" accessibilityLabel="Entendi" onPress={m.dismissNotice} style={s.noticeAction}><Text style={s.link}>Entendi</Text><Icon name="check" size={18}/></Pressable></View>}
            {!activeFeature&&(tab==='Feed'?<>
              <FeedFilters selected={filter} onSelect={setFilter}/>
              <View style={s.feedDivider}><Text style={s.sectionLabel}>Acompanhe de perto</Text><Text style={s.footnote}>{filter==='ALL'?'Todos os riscos':labels[filter]}</Text></View>
              {m.status==='loading'&&!data?<View style={s.empty}><ActivityIndicator color={t.ink}/><Text style={s.body}>Buscando as últimas leituras…</Text></View>:!alerts.length?<View style={s.empty}><Icon name="inbox-outline" size={30}/><Text style={s.body}>{data?'Nenhuma ocorrência para este filtro.':'Seu feed será preenchido quando os dados chegarem.'}</Text></View>:alerts.map(a=><AlertRow key={a.id} alert={a} serverTime={data!.serverTime} savedAt={m.snapshot!.savedAt} now={now} onReact={m.reactTo} voteDisabled={!m.canVote||m.votingId!==null} voting={m.votingId===a.id} onOpen={()=>openAlert(a)}/>)}
            </>:<View style={s.history}>
              <Text accessibilityRole="header" style={s.sectionLabel}>Histórico recebido</Text><Text style={s.historyInfo}>Até 30 leituras recentes · {data?.storedReadings??0} registros no servidor</Text>
              {!data?.readings.length&&<Text style={s.body}>Nenhuma leitura disponível.</Text>}
              {data?.readings.map(r=><View key={r.id} style={s.historyRow}><View style={s.historyIdentity}><Text style={s.historyTitle}>{r.district}</Text><Text style={s.historyMeta}>{labels[r.type]} · {r.source==='SENSOR'?'Sensor simulado':r.source==='PUBLIC_DATA'?'Base pública simulada':'Comunidade simulada'}</Text><Text style={s.footnote}>{new Date(r.observedAt).toLocaleString('pt-BR')}</Text></View><Text style={s.historyValue}>{r.value.toLocaleString('pt-BR',{maximumFractionDigits:1})}<Text style={s.historyUnit}> {r.type==='HEAT'?'°C':r.type==='FLOOD'?'mm/h':'min'}</Text></Text></View>)}
            </View>)}
            <FeatureScreens route={activeFeature} url={m.url} clientId={m.clientId} online={m.status==='online'}
              data={data} savedAt={m.snapshot?.savedAt} now={now}
              alert={selectedAlert?(data?.alerts.find(a=>a.id===selectedAlert.id)||selectedAlert):null}
              onNavigate={navigate} onOpenAlert={openAlert} onBackAlert={()=>navigate(alertOrigin.current)}/>
            {!showAside&&<View style={s.mobileProvenance}>{provenance}</View>}
          </View>
          {showAside&&<View style={s.aside}>
            {panorama}
            {provenance}
          </View>}
        </View>
      </ScrollView>
      {!wide&&tabs(false)}
    </View>
  </View></SafeAreaView>;
}
export default function App(){return <SafeAreaProvider><Screen/></SafeAreaProvider>;}

const s=StyleSheet.create({
  safe:{flex:1,backgroundColor:t.paper},shell:{flex:1,flexDirection:'row'},workspace:{flex:1,minWidth:0,backgroundColor:t.canvas},
  rail:{width:256,borderRightWidth:1,borderColor:t.line,paddingHorizontal:20,paddingTop:32,backgroundColor:t.paper},
  brandBlock:{gap:8,marginBottom:32,paddingHorizontal:12},brand:{fontSize:38,lineHeight:44,fontWeight:'800',letterSpacing:-1,color:t.primary},fullName:{fontSize:12,lineHeight:19,color:t.secondary},
  railTabs:{gap:8},railTab:{minHeight:72,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:10,paddingVertical:10,borderRadius:12},selectedRail:{backgroundColor:t.primarySoft},
  navIcon:{width:34,minHeight:32,alignItems:'center',justifyContent:'center',borderRadius:10},selectedIcon:{backgroundColor:t.primarySoft},navCopy:{flex:1,gap:4},mobileNavCopy:{alignItems:'center'},
  tabText:{fontSize:14,lineHeight:21,color:t.secondary,fontWeight:'500'},navDescription:{fontSize:11,lineHeight:16,color:t.secondary},
  railCreate:{minHeight:48,marginTop:24,paddingHorizontal:16,paddingVertical:12,borderRadius:10,backgroundColor:t.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},createText:{fontSize:14,lineHeight:22,fontWeight:'700',color:t.onPrimary},
  railFooter:{marginTop:'auto',paddingHorizontal:12,paddingVertical:24},
  topbar:{minHeight:82,paddingHorizontal:20,paddingVertical:12,borderBottomWidth:1,borderColor:t.line,backgroundColor:t.paper,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},
  topIdentity:{flex:1,minWidth:0,gap:3},topTitle:{fontSize:18,lineHeight:25,fontWeight:'700',color:t.ink},topDescription:{fontSize:12,lineHeight:19,color:t.secondary},mobileBrand:{fontSize:27,lineHeight:32,fontWeight:'800',letterSpacing:-.7,color:t.primary},mobileFullName:{fontSize:10,lineHeight:15,color:t.secondary},
  topActions:{flexDirection:'row',alignItems:'center',gap:4},refresh:{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center',borderRadius:12},
  status:{flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:9,paddingVertical:5,borderRadius:7,backgroundColor:t.primarySoft},offlineStatus:{backgroundColor:t.warningSoft},
  statusDot:{width:6,height:6,borderRadius:3,backgroundColor:t.primary},offlineDot:{backgroundColor:t.warning},small:{fontSize:10,lineHeight:17,color:t.ink,fontWeight:'600'},
  mobileTabs:{flexDirection:'row',flexShrink:0,minHeight:72,paddingVertical:6,paddingHorizontal:4,borderTopWidth:1,borderColor:t.line,backgroundColor:t.paper},
  mobileTab:{flex:1,minWidth:0,minHeight:60,paddingHorizontal:1,paddingVertical:4,alignItems:'center',justifyContent:'center',gap:3,borderRadius:10},mobileTabText:{fontSize:11,lineHeight:17,textAlign:'center'},selectedTab:{backgroundColor:t.primarySoft},
  scrollContent:{paddingHorizontal:16,paddingTop:20,paddingBottom:28},scrollWide:{paddingHorizontal:32,paddingTop:28},columns:{flexDirection:'row',justifyContent:'center',alignItems:'flex-start',width:'100%',maxWidth:1080,alignSelf:'center'},feed:{flex:1,maxWidth:760,minWidth:0},
  feedIntro:{gap:12,marginBottom:12},introMeta:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},introText:{flex:1,minWidth:0,fontSize:12,lineHeight:20,color:t.secondary},quickCreate:{minHeight:48,flexDirection:'row',alignItems:'center',gap:7},
  simulation:{flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,paddingHorizontal:12,borderRadius:9,backgroundColor:t.warningSoft,marginBottom:16},simulationText:{fontSize:11,lineHeight:18,color:t.warning,flex:1},
  feedDivider:{paddingVertical:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'},sectionLabel:{fontSize:15,lineHeight:22,fontWeight:'700',color:t.ink},footnote:{fontSize:11,lineHeight:18,color:t.secondary},
  notice:{backgroundColor:t.warningSoft,padding:18,marginBottom:16,borderRadius:12,gap:10},noticeTitle:{fontSize:15,lineHeight:23,fontWeight:'700',color:t.warning},body:{fontSize:14,lineHeight:23,color:t.ink},noticeAction:{minHeight:48,flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:10},link:{fontSize:13,lineHeight:20,color:t.primary,fontWeight:'700'},warning:{fontSize:13,lineHeight:20,color:t.warning,paddingVertical:16},empty:{paddingVertical:56,alignItems:'center',gap:18},
  aside:{width:248,gap:24},panorama:{gap:12,padding:20,borderWidth:1,borderRadius:14,borderColor:t.line,backgroundColor:t.paper},asideTitle:{fontSize:16,fontWeight:'700',lineHeight:24,color:t.ink},asideBody:{fontSize:13,lineHeight:22,color:t.secondary},panoramaRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8,minHeight:40},panoramaLabel:{flex:1,fontSize:12,lineHeight:20,color:t.ink},panoramaValue:{fontSize:13,lineHeight:20,fontWeight:'700',color:t.ink},
  provenance:{gap:14,padding:20,backgroundColor:t.paper,borderWidth:1,borderRadius:14,borderColor:t.line},aboutButton:{minHeight:48,flexDirection:'row',alignItems:'center',alignSelf:'flex-start',gap:8},mobileProvenance:{paddingTop:24,marginTop:8},
  compactOverview:{marginBottom:8,gap:8},overviewToggle:{minHeight:52,flexDirection:'row',alignItems:'center',gap:8,paddingVertical:10,paddingHorizontal:12,borderWidth:1,borderRadius:10,borderColor:t.line,backgroundColor:t.paper},overviewCount:{flex:1,textAlign:'right',fontSize:11,lineHeight:19,color:t.secondary},
  history:{padding:20,borderWidth:1,borderColor:t.line,borderRadius:14,backgroundColor:t.paper},historyInfo:{fontSize:12,lineHeight:20,color:t.secondary,marginTop:8,marginBottom:12},historyRow:{flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderColor:t.line,paddingVertical:20},historyIdentity:{flex:1,minWidth:0,gap:6},historyTitle:{fontSize:15,lineHeight:22,fontWeight:'700',color:t.ink},historyMeta:{fontSize:12,lineHeight:19,color:t.secondary},historyValue:{fontSize:22,lineHeight:30,color:t.ink},historyUnit:{fontSize:12,color:t.secondary},
});
