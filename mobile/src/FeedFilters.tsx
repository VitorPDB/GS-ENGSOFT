import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { theme as t,riskColors } from './theme';
import { Icon, IconName } from './Icon';
import type { RiskType } from './types';
export type Filter = RiskType|'ALL';
const filters:{id:Filter;label:string;short:string;icon:IconName}[]=[
  {id:'ALL',label:'Todos',short:'Todos',icon:'compass-outline'},
  {id:'FLOOD',label:'Alagamento',short:'Chuva',icon:'weather-pouring'},
  {id:'HEAT',label:'Calor extremo',short:'Calor',icon:'white-balance-sunny'},
  {id:'OUTAGE',label:'Energia',short:'Energia',icon:'flash-outline'},
];
export function FeedFilters({selected,onSelect}:{selected:Filter;onSelect:(filter:Filter)=>void}) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
    {filters.map(f=>{const tone=f.id==='ALL'?{ink:t.primary,soft:t.primarySoft}:riskColors[f.id];return <Pressable key={f.id} accessibilityRole="button" accessibilityLabel={f.label}
      accessibilityState={{selected:selected===f.id}} onPress={()=>onSelect(f.id)} style={({pressed})=>[s.filter,pressed&&{opacity:.65}]}>
      <View style={[s.ring,{borderColor:selected===f.id?tone.ink:t.line}]}><View style={[s.circle,{backgroundColor:tone.soft}]}><Icon name={f.icon} color={tone.ink} size={25}/></View></View>
      <Text style={[s.label,selected===f.id&&{fontWeight:'700',color:tone.ink}]}>{f.short}</Text>
    </Pressable>;})}
  </ScrollView>;
}
const s=StyleSheet.create({filters:{gap:16,paddingVertical:12},filter:{alignItems:'center',gap:8,minWidth:56,minHeight:82},ring:{width:58,height:58,borderRadius:18,borderWidth:1.5,padding:4},circle:{flex:1,borderRadius:13,justifyContent:'center',alignItems:'center'},label:{fontSize:12,lineHeight:18,color:t.secondary}});
