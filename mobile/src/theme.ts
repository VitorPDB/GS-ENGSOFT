export const theme = {
  paper:'#FFFFFF', canvas:'#F5F6F1', stone:'#EDF1E9', inset:'#E3EBE2',
  ink:'#19332E', secondary:'#53665F', line:'#DCE4DD', outline:'#7B9184',
  primary:'#0C665A', primarySoft:'#E5F2EC', onPrimary:'#FFFFFF',
  heroStart:'#123E3A', heroEnd:'#0C665A', heroMuted:'#D6ECE4',
  critical:'#A62F3C', high:'#97480B', moderate:'#E9F0FB', low:'#E9F4ED',
  info:'#235A9E', infoSoft:'#EDF3FC', warning:'#8B4B08', warningSoft:'#FFF2D9',
};
export const riskColors = {
  FLOOD:{ink:'#155E9A',soft:'#EAF3FC',end:'#F7FBFF',icon:'weather-pouring'},
  HEAT:{ink:'#8B4B08',soft:'#FFF2D9',end:'#FFFDF6',icon:'white-balance-sunny'},
  OUTAGE:{ink:'#6942A1',soft:'#F2ECFA',end:'#FCFAFF',icon:'flash-outline'},
} as const;
export const severityColors = {
  'Crítico':{ink:'#A62F3C',soft:'#FCEDEF',icon:'alert-octagon-outline'},
  'Alto':{ink:'#97480B',soft:'#FFF0DB',icon:'alert-outline'},
  'Moderado':{ink:'#235A9E',soft:'#EDF3FC',icon:'information-outline'},
  'Baixo':{ink:'#315E4A',soft:'#E9F4ED',icon:'check-circle-outline'},
} as const;
