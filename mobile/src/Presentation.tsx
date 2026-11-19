import React from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import {Icon,IconName} from './Icon';
import {theme as t,severityColors} from './theme';
import type {Severity} from './types';

export function PageIntro({title,subtitle,icon='compass-outline',featured=false}:{title:string;subtitle?:string;icon?:IconName;featured?:boolean}) {
  const compact=useWindowDimensions().width<600;
  return <View style={[s.intro,featured&&s.featured,featured&&compact&&s.compact]}>
    {(!featured||!compact)&&<View style={[s.symbol,featured&&s.featuredSymbol]}><Icon name={icon} color={featured?t.onPrimary:t.primary} size={23}/></View>}
    <Text accessibilityRole="header" style={[s.title,featured&&s.white,featured&&compact&&s.compactTitle]}>{title}</Text>
    {!!subtitle&&<Text style={[s.subtitle,featured&&s.muted]}>{subtitle}</Text>}
  </View>;
}
export function SeverityBadge({severity}:{severity:Severity}) {
  const tone=severityColors[severity];
  return <View style={[s.badge,{backgroundColor:tone.soft}]}><Icon name={tone.icon} size={16} color={tone.ink}/><Text style={[s.badgeText,{color:tone.ink}]}>{severity}</Text></View>;
}
const s=StyleSheet.create({
  intro:{gap:10,paddingTop:6,paddingBottom:8},
  featured:{padding:26,borderRadius:16,backgroundColor:t.heroStart,backgroundImage:`linear-gradient(125deg, ${t.heroStart}, ${t.heroEnd})`},
  compact:{padding:20},compactTitle:{fontSize:26,lineHeight:34},
  symbol:{width:42,height:42,borderRadius:12,backgroundColor:t.primarySoft,alignItems:'center',justifyContent:'center',marginBottom:4},
  featuredSymbol:{backgroundColor:'#235D53'},
  title:{fontSize:28,lineHeight:36,fontWeight:'700',letterSpacing:-.5,color:t.ink},
  subtitle:{fontSize:14,lineHeight:23,color:t.secondary},white:{color:t.onPrimary},muted:{color:t.heroMuted},
  badge:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:7,paddingVertical:7,paddingHorizontal:8,alignSelf:'flex-start'},
  badgeText:{fontSize:11,lineHeight:16,fontWeight:'700'},
});
