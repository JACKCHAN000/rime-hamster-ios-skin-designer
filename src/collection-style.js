// Collections share the board surface; only a press/selection gets a flat tint.
export function collectionStyles({text}){
  const hiddenBadge={badgeFontSize:8,badgeNormalColor:'#00000000',badgeHighlightColor:'#00000000'};
  return {
    symbolItemBackground:{buttonStyleType:'geometry',normalColor:'#00000000',highlightColor:`${text}14`,cornerRadius:0,borderSize:0,shadowOpacity:0},
    symbolCell:{backgroundStyle:'symbolItemBackground',foregroundStyle:'symbolText'},
    symbolCategoryCell:{backgroundStyle:'symbolItemBackground',foregroundStyle:'symbolCategoryText'},
    symbolText:{buttonStyleType:'text',text:'',fontSize:19,normalColor:text,highlightColor:text,...hiddenBadge},
    symbolCategoryText:{buttonStyleType:'text',text:'',fontSize:14,fontWeight:'medium',normalColor:`${text}A3`,highlightColor:text,...hiddenBadge},
  };
}
