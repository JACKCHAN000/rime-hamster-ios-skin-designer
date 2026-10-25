import { stringify, parseDocument } from 'yaml';
import { zipSync, strToU8 } from 'fflate';
import { alpha, assertProject, clone, keyboardDescriptors, keyboardRows, resolveAppearance, safeArchivePath, safeName, TOOL_OPTIONS,languageAction } from './model.js';
import { glyphStyle, actionStyle } from './key-presentation.js';
import { actionLabel,hiddenSwipeHint } from './actions.js';
import {applySchemaBindings,keyboardSwitchType} from './schema-binding.js';
import {collectionStyles} from './collection-style.js';
import {applyKeyPresentation,legendLabel} from './presentation-settings.js';
import {spaceSymbolColor,spaceSymbolResource} from './space-symbol.js';
import {isLiteralSpaceAction} from './space-behavior.js';
function mixColor(color,background,amount){return '#'+[1,3,5].map((at)=>Math.round(parseInt(color.slice(at,at+2),16)*amount+parseInt(background.slice(at,at+2),16)*(1-amount)).toString(16).padStart(2,'0')).join('');}
function nativeAppearance(p,theme){const a=resolveAppearance(p,theme);return {...a,accentInk:theme==='light'?mixColor(a.accent,'#000000',0.42):a.accent};}
function contrastInk(color){const [r,g,b]=[1,3,5].map((at)=>parseInt(color.slice(at,at+2),16));return r*0.299+g*0.587+b*0.114>155?'#142B3D':'#FFFFFF';}

export function descriptorName({ page = 'main', locale = 'zh', orientation = 'portrait' }) {
  if(page==='panel')return `panel_${orientation}`;
  if (page === 'numeric') return `numeric${locale === 'en' ? '_en' : ''}_${orientation}`;
  return page === 'hamster' ? `symbolic_${orientation}` : page === 'main' ? `${locale === 'zh' ? 'pinyin' : 'alphabetic'}_${orientation}` : `ios_${locale}_symbols_${page === 'symbols2' ? 2 : 1}_${orientation}`;
}
export function isLegacyNumericLayout(layout){
  if(!Array.isArray(layout)||layout.length!==5)return false;
  const rows=layout.map((row)=>row?.HStack?.subviews?.map((node)=>node.Cell));
  const digits=(...values)=>values.map((n)=>`key_digit_${n}`);
  const core=[
    [...digits(1,2,3),'key_backspace'],[...digits(4,5,6),'key_numeric_minus'],
    [...digits(7,8,9),'key_numeric_plus'],['key_numeric_dot','key_digit_0','key_numeric_equal'],
  ];
  const bottoms=[['symbols','numeric','language','space','period','enter'],['return','emoji','space','enter'],['return','comma','space','period','enter'],['return','language','space','period','enter']];
  return core.every((row,i)=>JSON.stringify(rows[i])===JSON.stringify(row))&&bottoms.some((row)=>JSON.stringify(rows[4])===JSON.stringify(row.map((id)=>`key_${id}`)));
}
function foreground(root, name, label, appearance, fontSize, presentation = glyphStyle(label)) {
  root[name] = { ...presentation, fontSize, normalColor: appearance.text, highlightColor: appearance.text };
  return name;
}
function bindLanguageState(root,cell,prefix,a,toolbar=false,keyboardLocale=null){
  const zh=`${prefix}_zh_fg`,en=`${prefix}_en_fg`,zhBg=toolbar?'languageToolbarBackground':'keyBackground',enBg=zhBg;
  foreground(root,zh,'中',a,16);foreground(root,en,'EN',a,16);root[`${prefix}_fg`]={...root[keyboardLocale==='en'?en:zh]};
  root[zhBg] ||= {buttonStyleType:'geometry',normalColor:'#00000000'};
  if(!toolbar)root.languageEnglishBackground=clone(root.keyBackground);
  if(keyboardLocale){cell.foregroundStyle=keyboardLocale==='en'?en:zh;cell.backgroundStyle=keyboardLocale==='en'?enBg:zhBg;return;}
  cell.foregroundStyle=[{conditionKey:'rime$ascii_mode',conditionValue:false,styleName:zh},{conditionKey:'rime$ascii_mode',conditionValue:true,styleName:en}];
  cell.backgroundStyle=[{conditionKey:'rime$ascii_mode',conditionValue:false,styleName:zhBg},{conditionKey:'rime$ascii_mode',conditionValue:true,styleName:enBg}];
  const notifications=[`${prefix}_zh_notification`,`${prefix}_en_notification`];
  root[notifications[0]]={notificationType:'rime',rimeNotificationType:'optionChanged',rimeOptionName:'ascii_mode',rimeOptionValue:false,foregroundStyle:zh,backgroundStyle:zhBg};
  root[notifications[1]]={notificationType:'rime',rimeNotificationType:'optionChanged',rimeOptionName:'ascii_mode',rimeOptionValue:true,foregroundStyle:en,backgroundStyle:enBg};
  cell.notification=[...(Array.isArray(cell.notification)?cell.notification:cell.notification?[cell.notification]:[]),...notifications];
}
function attachChoices(root,cell,name,rows,selected,a){
  const symbols=rows.map((row,r)=>row.map((choice,c)=>{
    if(!choice)return null;
    const id=`${name}_choice_${r}_${c}`,fg=`${id}_fg`;
    foreground(root,fg,choice.label,a,18,choice.presentation||glyphStyle(choice.label));root[fg].highlightColor=a.text;
    root[id]={foregroundStyle:fg,action:clone(choice.action)};
    if(choice.uppercasedStateAction){
      root[id].uppercasedStateAction=clone(choice.uppercasedStateAction);root[id].uppercasedStateForegroundStyle=foreground(root,`${fg}_upper`,choice.upperLabel,a,18,choice.upperPresentation||glyphStyle(choice.upperLabel));root[`${fg}_upper`].highlightColor=a.text;
      root[id].capsLockedStateForegroundStyle=choice.capsPresentation?foreground(root,`${fg}_caps`,choice.upperLabel,a,18,choice.capsPresentation):root[id].uppercasedStateForegroundStyle;
      if(choice.capsPresentation)root[`${fg}_caps`].highlightColor=a.text;
    }
    if(choice.preeditStateAction)root[id].preeditStateAction=clone(choice.preeditStateAction);
    return id;
  }));
  const first=symbols.flatMap((row,r)=>row.map((v,c)=>v?{row:r,col:c}:null)).find(Boolean);
  const active=selected&&symbols[selected.row]?.[selected.col]?selected:first;
  const flat=symbols.flat().filter(Boolean),chosen=symbols[active.row][active.col];
  cell.hintSymbolsStyle=`${name}_hold`;
  root[cell.hintSymbolsStyle]={size:{width:42,height:44},insets:{top:4,bottom:4,left:4,right:4},backgroundStyle:'hintBackground',selectedBackgroundStyle:'hintSelected',selectedIndex:flat.indexOf(chosen),symbolStyles:flat};
  delete cell.hintSymbolsGridStyle;
  if(rows.length>1||rows[0].some((choice)=>!choice)){
    cell.hintSymbolsGridStyle=`${name}_grid`;
    root[cell.hintSymbolsGridStyle]={size:{width:42,height:44},spacing:{horizontal:3,vertical:3},selected:active,moveThreshold:10,moveStep:{horizontal:30,vertical:30},backgroundStyle:'hintBackground',selectedBackgroundStyle:'hintSelected',symbolRows:symbols};
  }
}
function baseRoot(p, theme, orientation,locale) {
  const a = nativeAppearance(p, theme), dims = p.dimensions[orientation];
  const selectionColor=mixColor(a.accent,theme==='dark'?'#000000':'#FFFFFF',theme==='dark'?0.35:0.18);
  const root = {
    preeditHeight: p.behavior.showPreedit ? dims.preeditHeight : 0, toolbarHeight: dims.toolbarHeight, keyboardHeight: dims.keyboardHeight,
    preeditStyle: { insets: { left: 12, right: 12 }, backgroundStyle: 'boardBackground', foregroundStyle: 'preeditText' },
    preeditText: { fontSize: 13, textColor: a.text, fontWeight: 'regular' },
    toolbarStyle: { insets: { left: 7, right: 7 }, backgroundStyle: 'boardBackground' },
    keyboardStyle: { insets: { left: 4, right: 4, top: 2, bottom: 3 }, backgroundStyle: 'boardBackground' },
    boardBackground: { buttonStyleType: 'geometry', normalColor: a.boardFill },
    keyBackground: { buttonStyleType: 'geometry', insets: { left: a.gap / 2, right: a.gap / 2, top: a.gap / 2, bottom: a.gap / 2 }, normalColor: a.fill, highlightColor: a.activeFill, cornerRadius: a.radius, borderSize: a.border, normalBorderColor: alpha(a.text, 0.12), highlightBorderColor: alpha(a.text, 0.28), normalShadowColor: '#000000', shadowOpacity: a.shadow, shadowRadius: 2, shadowOffset: { x: 0, y: 1 } },
    hintBackground: { buttonStyleType: 'geometry', normalColor: theme === 'dark' ? '#4A4D52' : '#FFFFFF', cornerRadius: 11 },
    hintSelected: { buttonStyleType: 'geometry', normalColor: selectionColor, highlightColor:selectionColor, cornerRadius: 8, borderSize:1, normalBorderColor:a.accentInk, highlightBorderColor:a.accentInk },
    keyScale: { animationType: 'scale', scale: 0.95, pressDuration: 50, releaseDuration: 100, isAutoReverse: false },
  };
  root.toolbarLayout = [{ HStack: { subviews: p.toolbar.map((id) => {
    const option = TOOL_OPTIONS.find((t) => t[0] === id);
    const name = `tool_${id}`;
    const fg = foreground(root, `${name}_fg`, id === 'menu' ? '☰' : id === 'language' ? 'EN' : id, a, id==='menu'?27:id==='symbols'?14:18);
    root[name] = { type: 'button', foregroundStyle: fg, action: clone(option[2]) };
    root[name].bounds={alignment:'center',width:28,height:28};
    root[fg].fontWeight='medium';root[fg].center={x:0.5,y:0.5};root[fg].contentMode='center';
    if(root[fg].buttonStyleType==='systemImage')root[fg].fontSize=17;
    if (id === 'language') {
      root[name].action=languageAction(locale,p.schemaBinding);bindLanguageState(root,root[name],name,a,true,locale);
    }
    if (id === 'traditional') {
      foreground(root, 'tool_traditional_zh_fg', '繁', a, 17); foreground(root, 'tool_traditional_cn_fg', '簡', a, 17);
      for(const id of ['tool_traditional_zh_fg','tool_traditional_cn_fg']){root[id].fontWeight='medium';root[id].center={x:0.5,y:0.5};}
      root[name].foregroundStyle = [{ conditionKey: 'rime$simplification', conditionValue: false, styleName: 'tool_traditional_zh_fg' }, { conditionKey: 'rime$simplification', conditionValue: true, styleName: 'tool_traditional_cn_fg' }];
      root[name].notification = ['traditionalNotification','simplifiedNotification'];
      root.traditionalNotification = { notificationType: 'rime', rimeNotificationType: 'optionChanged', rimeOptionName: 'simplification', rimeOptionValue: false, foregroundStyle: 'tool_traditional_zh_fg' };
      root.simplifiedNotification = { notificationType: 'rime', rimeNotificationType: 'optionChanged', rimeOptionName: 'simplification', rimeOptionValue: true, foregroundStyle: 'tool_traditional_cn_fg' };
      root.tool_ascii_off_fg={...root.tool_traditional_zh_fg,text:'EN+',fontSize:15,fontWeight:'medium',center:{x:0.5,y:0.5}};
      root.tool_ascii_on_fg={...root.tool_ascii_off_fg,text:'EN-'};
      root.englishAsciiOffNotification={notificationType:'rime',rimeNotificationType:'optionChanged',rimeOptionName:'ascii_mode',rimeOptionValue:false,foregroundStyle:'tool_ascii_off_fg'};
      root.englishAsciiOnNotification={...root.englishAsciiOffNotification,rimeOptionValue:true,foregroundStyle:'tool_ascii_on_fg'};
      if(locale==='en'){
        root[name].action={shortcut:'#中英切换'};
        root[name].foregroundStyle=[{conditionKey:'rime$ascii_mode',conditionValue:false,styleName:'tool_ascii_off_fg'},{conditionKey:'rime$ascii_mode',conditionValue:true,styleName:'tool_ascii_on_fg'}];
        root[name].notification=['englishAsciiOffNotification','englishAsciiOnNotification'];
      }
    }
    return { Cell: name };
  }) } }];
  root.horizontalCandidatesStyle = { backgroundStyle: 'boardBackground', insets: { left: 6, right: 6 } };
  root.horizontalCandidatesLayout = [{ HStack: { subviews: [{ Cell: 'candidatesHorizontal' }, { Cell: 'candidatesExpand' }] } }];
  root.candidatesHorizontal = { type: 'horizontalCandidates', candidateStyle: 'candidateText', interCellSpacing: 8 };
  root.candidatesExpand = { size: { width: 38 }, foregroundStyle: foreground(root, 'expandFg', 'collapse', a, 22), action: { shortcut: '#candidatesBarStateToggle' } };
  root.verticalCandidatesStyle = { backgroundStyle: 'boardBackground', insets: { left: 6, right: 6 } };
  root.verticalCandidatesLayout = [{ HStack: { subviews: [{ Cell: 'candidatesVertical' }] } }, { HStack: { style: 'candidateBottomSize', subviews: [{ Cell: 'candidatesPrevious' },{ Cell: 'candidatesNext' },{ Cell: 'candidatesCollapse' }] } }];
  root.candidateBottomSize = { size: { height: 36 } };
  root.candidatesVertical = { type: 'verticalCandidates', candidateStyle: 'candidateText', maxRows: 4 };
  root.candidateText = { insets: { left: 9, right: 9, top: 6, bottom: 6 }, textFontSize: 20, commentFontSize: 11, indexFontSize: 10, preferredTextColor: a.accentInk, textColor: a.text, preferredCommentColor: alpha(a.text, 0.6), commentColor: alpha(a.text,0.6), indexColor: alpha(a.text,0.4), preferredIndexColor: a.accentInk, backgroundCornerRadius: 8 };
  for (const [id,label,command] of [['Previous','previousPage','#verticalCandidatesPageUp'],['Next','nextPage','#verticalCandidatesPageDown'],['Collapse','collapse','#candidatesBarStateToggle']]) root[`candidates${id}`] = { foregroundStyle: foreground(root, `candidate${id}Fg`, label, a, 18), action: { shortcut: command } };
  return root;
}
export function buildNativeKeyboard(p, { theme = 'dark', orientation = 'portrait', page = 'main', locale = 'zh' } = {}) {
  const a = nativeAppearance(p, theme), root = baseRoot(p, theme, orientation,locale);
  if(page==='panel')buildPanel(root,p,a);
  else if (page === 'hamster') buildCollection(root, p, a);
  else {
    const rows = keyboardRows(p, { page, locale });
    root.keyboardLayout = rows.map((row) => {
      const total = row.reduce((sum,key) => sum + key.width,0);
      return { HStack: { subviews: row.map((key) => {
        const name = `key_${key.id}`;
        const cell = { size: { width: `${key.width}/${total}` } };
        if (key.role !== 'spacer') {
          cell.backgroundStyle = 'keyBackground';
          const label = key.label;
          const size = key.role === 'letter' ? a.fontSize : page==='numeric'&&key.id.startsWith('digit_') ? 24 : key.role === 'space' ? 23 : key.role === 'emoji' ? 17 : key.role === 'enter' ? 21 : key.label==='symbols'?14:['shift','backspace','back'].includes(key.label) ? 22 : key.label.length > 1 ? 14 : 19;
          const customLabel = p.keys[`${locale}:${key.id}`]?.label;
          cell.foregroundStyle = foreground(root, `${name}_fg`, key.role === 'emoji' ? 'smile' : label, a, size, customLabel !== undefined ? {buttonStyleType:'text',text:label} : glyphStyle(key.role === 'emoji' ? 'smile' : label));
          if(key.role==='emoji')root[`${name}_fg`].fontWeight='medium';
          cell.action = clone(key.action);
          if((cell.action==='space'||isLiteralSpaceAction(cell.action))&&key.preeditStateAction)cell.preeditStateAction=clone(key.preeditStateAction);
          if (key.id === 'backspace') cell.repeatAction = 'backspace';
          if (key.swipeUpAction) cell.swipeUpAction = clone(key.swipeUpAction);
          if (key.swipeDownAction) cell.swipeDownAction = clone(key.swipeDownAction);
          const hints = [];
          for (const direction of ['Up','Down']) {
            const action = cell[`swipe${direction}Action`];
            if (!action || action === 'none'||hiddenSwipeHint(key.id,action)) continue;
            const hintName = `${name}_swipe${direction}_hint`, presentation = p.behavior.hintStyle === 'icons' ? actionStyle(action) : {buttonStyleType:'text',text:actionLabel(action)};
            const hintPresentation = presentation.buttonStyleType === 'text' ? {...presentation,text:[...String(presentation.text)].slice(0,3).join('')} : presentation;
            foreground(root,hintName,'',a,key.role === 'letter' ? 7 : 6,hintPresentation);
            root[hintName].center = {x:direction==='Up'?0.24:0.79,y:0.20};root[hintName].normalColor = alpha(a.text,0.48);
            hints.push(hintName);
          }
          if (hints.length) cell.foregroundStyle = [cell.foregroundStyle,...hints];
          if (key.role==='letter' && hints.length) root[`${name}_fg`].center={x:0.5,y:0.60};
          if (key.role === 'letter' && locale === 'en' && /^[a-z]$/.test(cell.action?.character||'')) {
            cell.uppercasedStateAction = { character: cell.action.character.toUpperCase() };
            cell.uppercasedStateForegroundStyle = [foreground(root, `${name}_upper_fg`, customLabel??key.id.toUpperCase(), a, a.fontSize,{buttonStyleType:'text',text:customLabel??key.id.toUpperCase()}),...hints];
            cell.capsLockedStateForegroundStyle=[...cell.uppercasedStateForegroundStyle];
            if(hints.length)root[`${name}_upper_fg`].center={x:0.5,y:0.60};
          }
          if(key.id==='shift'){
            cell.uppercasedStateAction='shift';
            cell.uppercasedStateForegroundStyle=foreground(root,`${name}_upper_fg`,'shiftActive',{...a,text:a.accentInk},22);
            cell.capsLockedStateForegroundStyle=foreground(root,`${name}_caps_fg`,'capsLock',{...a,text:a.accentInk},22);
          }
          if (key.holdAction) {
            const hint = `${name}_hold`, choice = `${name}_choice`;
            cell.hintSymbolsStyle = hint;
            root[hint] = { size: { width: 114, height: 42 }, backgroundStyle: 'hintBackground', selectedBackgroundStyle: 'hintSelected', selectedIndex: 0, symbolStyles: [choice] };
            root[choice] = { foregroundStyle: foreground(root, `${choice}_fg`, key.holdAction.keyboardType === 'symbolic' ? '元書符號' : 'iOS 符號', a, 15), action: clone(key.holdAction) };
          }
          if (key.longPress?.rows?.some((row)=>row.some(Boolean))) {
            attachChoices(root,cell,name,key.longPress.rows.map((row)=>row.map((text)=>text?{label:text,presentation:{buttonStyleType:'text',text},action:{symbol:text}}:null)),key.longPress.selected,a);
          } else if ([cell.swipeUpAction,cell.swipeDownAction].some((action)=>action&&action!=='none')) {
            const choices=[];
            if(cell.swipeUpAction&&cell.swipeUpAction!=='none'&&!hiddenSwipeHint(key.id,cell.swipeUpAction))choices.push({label:actionLabel(cell.swipeUpAction),presentation:{buttonStyleType:'text',text:actionLabel(cell.swipeUpAction)},action:cell.swipeUpAction});
            const selected=choices.length;
            const stateStyle=(ref)=>{const style=root[Array.isArray(ref)?ref[0]:ref];return style?{...style,center:{x:0.5,y:0.5}}:undefined;};
            choices.push({label:key.label,presentation:customLabel!==undefined?{buttonStyleType:'text',text:key.label}:glyphStyle(key.label),action:cell.action,uppercasedStateAction:cell.uppercasedStateAction,upperLabel:customLabel??(key.role==='letter'?key.id.toUpperCase():key.label),upperPresentation:stateStyle(cell.uppercasedStateForegroundStyle),capsPresentation:stateStyle(cell.capsLockedStateForegroundStyle),preeditStateAction:cell.preeditStateAction});
            if(cell.swipeDownAction&&cell.swipeDownAction!=='none'&&!hiddenSwipeHint(key.id,cell.swipeDownAction))choices.push({label:actionLabel(cell.swipeDownAction),presentation:{buttonStyleType:'text',text:actionLabel(cell.swipeDownAction)},action:cell.swipeDownAction});
            attachChoices(root,cell,name,[choices],{row:0,col:selected},a);
          }
          if(key.id==='language' && (keyboardSwitchType(cell.action)||cell.action?.shortcut==='#中英切换'||cell.action?.shortcutCommand==='#中英切换')){
            const keyboardLocale=keyboardSwitchType(cell.action)?locale:null;
            bindLanguageState(root,cell,name,a,false,keyboardLocale);
            const hint=root[cell.hintSymbolsStyle],selected=hint?.symbolStyles?.[hint.selectedIndex],choice=root[selected];
            if(choice?.action?.shortcut==='#中英切换'||keyboardSwitchType(choice?.action)){
              bindLanguageState(root,choice,selected,a,false,keyboardLocale);root[`${selected}_zh_fg`].highlightColor=a.text;root[`${selected}_en_fg`].highlightColor=a.text;
            }
          }
          if (p.behavior.animation) cell.animation = ['keyScale'];
          if (key.id === 'enter') {
            foreground(root, 'returnActiveFg','return',{ ...a,text: contrastInk(a.accent) },21);
            root.returnActiveBg = { ...clone(root.keyBackground), normalColor: a.accent };
            root.returnDuringPreedit = { notificationType: 'preeditChanged', backgroundStyle: 'returnActiveBg', foregroundStyle: ['returnActiveFg',...hints], action: 'enter' };
            cell.notification = ['returnDuringPreedit'];
          }
        }
        root[name] = cell;
        return { Cell: name };
      }) } };
    });
  }
  const path = `${theme === 'dark' ? 'dark' : 'light'}/${descriptorName({page,locale,orientation})}.yaml`;
  const overrides=clone(p.nativeOverrides[path] || {});
  if(page==='numeric'&&isLegacyNumericLayout(overrides.keyboardLayout)){
    // Reflow our old five-row page while keeping its actions, artwork and source data.
    delete overrides.keyboardLayout;
    for(const row of root.keyboardLayout)for(const {Cell:name} of row.HStack.subviews)if(overrides[name]){
      overrides[name].size={...overrides[name].size,width:root[name].size.width};
    }
  }
  return applyKeyPresentation(applySchemaBindings({ ...root, ...overrides },p.schemaBinding),p,{theme,locale});
}
function buildPanel(root,p,a){
  root.preeditHeight=0;root.toolbarHeight=0;root.keyboardHeight=164;root.toolbarLayout=[];root.floatTargetScale={x:0.75,y:0.6};
  root.keyboardStyle={backgroundStyle:'boardBackground',insets:{top:8,bottom:8,left:8,right:8}};
  const items=[
    ['settings','設定','gearshape',{openURL:'hamster3://com.ihsiao.apps.hamster3/'}],
    ['switcher','方案','globe',{shortcut:'#RimeSwitcher'}],
    ['phrase','常用語','text.bubble',{shortcut:'#showPhraseView'}],
    ['files','檔案','folder',{openURL:'hamster3://com.ihsiao.apps.hamster3/finder'}],
    ['skins','皮膚','tshirt',{openURL:'hamster3://com.ihsiao.apps.hamster3/keyboardSkins'}],
    ['upload','上傳','square.and.arrow.up',{openURL:'hamster3://com.ihsiao.apps.hamster3/wifi'}],
    ['deploy','部署','arrow.clockwise',{openURL:'hamster3://com.ihsiao.apps.hamster3/rime?action=deploy'}],
    ['embedded','內嵌','square.and.pencil',{shortcut:'#toggleEmbeddedInputMode'}],
  ];
  root.keyboardLayout=[0,1].map((row)=>({HStack:{subviews:items.slice(row*4,row*4+4).map(([id,label,image,action])=>{
    const name=`panel_${id}`,fg=`${name}_fg`,caption=`${name}_caption`;
    root[fg]={buttonStyleType:'systemImage',systemImageName:image,fontSize:23,center:{x:0.5,y:0.35},normalColor:a.text,highlightColor:a.text};
    foreground(root,caption,label,a,12);root[caption].center={x:0.5,y:0.76};
    root[name]={backgroundStyle:'keyBackground',foregroundStyle:[fg,caption],action};return {Cell:name};
  })}}));
}
function buildCollection(root, p, a) {
  root.keyboardLayout = [{ HStack: { subviews: [{ Cell: 'symbolCategories' },{ Cell: 'symbolContent' }] } },{ HStack: { style: 'collectionBottomSize', subviews: [{ Cell: 'collectionPrevious' },{ Cell: 'collectionNext' },{ Cell: 'collectionReturn' }] } }];
  root.collectionBottomSize = { size: { height: 38 } };
  root.symbolCategories = { type: 'classifiedSymbols', size: { width: '1/6' }, dataSource: 'categoryNames', cellStyle: 'symbolCategoryCell', insets: { left: 3, right: 3 }, maximumRow: 6, displaySeparatorLine:false };
  root.symbolContent = { type: 'subClassifiedSymbols', cellStyle: 'symbolCell', maximumRow: 4, maximumColumn: 6, displaySeparatorLine: false };
  Object.assign(root,collectionStyles(a));
  root.categoryNames = Object.keys(p.collections);
  for (const [name,data] of Object.entries(p.collections)) {
    if (Object.hasOwn(root, name)) throw new Error(`分類名稱「${name}」與樣式名稱衝突，請重新命名。`);
    root[name] = clone(data);
  }
  for (const [id,label,action] of [['Previous','previousPage',{shortcut:'#subCollectionPageUp'}],['Next','nextPage',{shortcut:'#subCollectionPageDown'}],['Return','back','returnPrimaryKeyboard']]) root[`collection${id}`] = { backgroundStyle: 'symbolItemBackground', foregroundStyle: foreground(root, `collection${id}Fg`,label,a,20), action };
}
export function buildConfig(p) {
  const entry = (prefix) => ({ iPhone: { portrait: `${prefix}_portrait`, landscape: `${prefix}_landscape` }, iPad: { portrait: `${prefix}_landscape`, landscape: `${prefix}_landscape`, floating: `${prefix}_portrait` } });
  const config = { name: p.meta.name, author: p.meta.author, pinyin: entry('pinyin'), alphabetic: entry('alphabetic'), symbolic: entry('symbolic'), numeric:entry('numeric'), studio_en_numeric:entry('numeric_en'), panel:entry('panel') };
  for (const locale of ['zh','en']) for (const n of [1,2]) config[`ios_${locale}_symbols_${n}`] = entry(`ios_${locale}_symbols_${n}`);
  return p.nativeConfig ? { ...config, ...clone(p.nativeConfig), name: p.meta.name, author: p.meta.author } : config;
}
export function yamlText(value) { return stringify(value, { lineWidth: 0, defaultStringType: 'QUOTE_DOUBLE', simpleKeys: true }); }
export function parseNativeYaml(text) {
  if (text.length > 2_000_000) throw new Error('單一 YAML 超過 2 MB。');
  const doc = parseDocument(text, { merge: true, uniqueKeys: true });
  if (doc.errors.length) throw new Error(doc.errors.map((x) => x.message).join('\n'));
  const value = doc.toJS({ maxAliasCount: 100 });
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('YAML 根節點必須是物件。');
  return value;
}
const refs = new Set(['backgroundStyle','foregroundStyle','uppercasedStateForegroundStyle','capsLockedStateForegroundStyle','swipeUpForegroundStyle','swipeDownForegroundStyle','hintStyle','hintSymbolsStyle','hintSymbolsGridStyle','cellStyle','candidateStyle','styleName','notification','animation','selectedBackgroundStyle','symbolStyles']);
export function validateNative(root) {
  const errors = [];
  function visit(value, path = '') {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach((v,i) => visit(v, `${path}[${i}]`)); return; }
    for (const [key,child] of Object.entries(value)) {
      const location = path ? `${path}.${key}` : key;
      if (key === 'Cell' && (typeof child !== 'string' || !Object.hasOwn(root,child))) errors.push(`${location} 引用了不存在的 ${child}`);
      if (refs.has(key)) {
        const names = typeof child === 'string' ? [child] : Array.isArray(child) ? child.filter((v) => typeof v === 'string') : [];
        for (const name of names) if (!Object.hasOwn(root,name)) errors.push(`${location} 找不到樣式 ${name}`);
      }
      if (key === 'symbolRows' && Array.isArray(child)) for (const row of child) for (const name of Array.isArray(row) ? row : []) if (name && !Object.hasOwn(root,name)) errors.push(`${location} 找不到樣式 ${name}`);
      if (key === 'subviews' && Array.isArray(child)) {
        const types = new Set(child.map((v) => ['Cell','HStack','VStack'].find((k) => v && Object.hasOwn(v,k))));
        if (types.size > 1 || types.has(undefined)) errors.push(`${location} 的同層節點種類不一致。`);
      }
      visit(child,location);
    }
  }
  visit(root);
  for (const key of ['preeditHeight','toolbarHeight','keyboardHeight']) if (root[key] === undefined) errors.push(`缺少 ${key}`);
  for (const key of ['keyboardLayout','toolbarLayout','horizontalCandidatesLayout','verticalCandidatesLayout']) if (root[key] && (!Array.isArray(root[key]) || root[key].some((node) => node.Cell))) errors.push(`${key} 根層不能直接放 Cell。`);
  return [...new Set(errors)];
}
export function packageEntries(p, demoPng) {
  assertProject(p);
  if (!(demoPng instanceof Uint8Array) || ![137,80,78,71,13,10,26,10].every((value,index) => demoPng[index] === value)) throw new Error('請先產生有效的預覽 PNG。');
  const nativeRoots=[];
  const entries = { 'config.yaml': strToU8(yamlText(buildConfig(p))), 'demo.png': demoPng, 'studio.project.json': strToU8(JSON.stringify(p,null,2)), 'README.md': strToU8(`${p.meta.name}\n\n${p.meta.description}\n\n中文字面：${legendLabel(p.legend)}。字面與送給 RIME 的字母鍵值分開。\n符號鍵短按開啟所選符號頁；長按放開執行另一個符號入口。123 開獨立數字頁。中文句號長按可選 ， 。 , . ! ?；英文句號使用 .，長按僅提供 , . ! ?。 句號上下滑將 / 送給 RIME，鍵面隱藏提示。\n本皮膚由元書造型所產生。玻璃質感使用原生幾何近似，未包含系統即時折射。\n`) };
  for (const theme of ['light','dark']) for (const descriptor of [...keyboardDescriptors(),...['portrait','landscape'].map((orientation) => ({page:'hamster',locale:'zh',orientation}))]) {
    const root = buildNativeKeyboard(p,{...descriptor,theme});
    nativeRoots.push({root,theme});
    const errors = validateNative(root);
    if (errors.length) throw new Error(`${theme}/${descriptorName(descriptor)}：\n${errors.slice(0,8).join('\n')}`);
    entries[`${theme}/${descriptorName(descriptor)}.yaml`] = strToU8(yamlText(root));
  }
  for (const [path,base64] of Object.entries(p.assets)) {
    if (!safeArchivePath(path)) throw new Error(`不安全的資源路徑：${path}`);
    if (entries[path]) continue;
    const binary = atob(base64); entries[path] = Uint8Array.from(binary,(x) => x.charCodeAt(0));
  }
  for (const [path,value] of Object.entries(p.nativeOverrides)) {
    if (entries[path]) continue;
    const effective=applyKeyPresentation(applySchemaBindings(value,p.schemaBinding),p,{theme:path.split('/')[0],locale:/\/(alphabetic|numeric_en|ios_en_)/.test(path)?'en':null}),errors = validateNative(effective);
    if (errors.length) throw new Error(`${path}：${errors[0]}`);
    entries[path] = strToU8(yamlText(effective));
    nativeRoots.push({root:effective,theme:path.split('/')[0]});
  }
  function addGeneratedResources(value,theme){
    if(!value||typeof value!=='object')return;
    if(spaceSymbolColor(value)){
      const file=value.normalImage.file,base=`${theme}/resources/${file}`;
      if(!entries[`${base}.png`]||!entries[`${base}.yaml`]){
        const resource=spaceSymbolResource(file);entries[`${base}.png`] ||= resource.png;entries[`${base}.yaml`] ||= strToU8(resource.yaml);
      }
    }
    for(const child of Object.values(value))addGeneratedResources(child,theme);
  }
  for(const {root,theme} of nativeRoots)addGeneratedResources(root,theme);
  const config = buildConfig(p);
  for (const [type,devices] of Object.entries(config)) {
    if (!devices || typeof devices !== 'object' || Array.isArray(devices) || ['fontFace','keySound'].includes(type)) continue;
    for (const device of ['iPhone','iPad']) for (const name of Object.values(devices[device] || {})) {
      if (typeof name !== 'string') throw new Error(`${type}.${device} 的鍵盤映射必須是檔名。`);
      for (const theme of ['light','dark']) if (!entries[`${theme}/${name}.yaml`]) throw new Error(`${type}.${device} 找不到 ${theme}/${name}.yaml`);
    }
  }
  const requireFile = (path) => { if (!entries[path]) throw new Error(`資源引用缺少檔案：${path}`); };
  for (const font of config.fontFace || []) if (font?.url && !font.name) requireFile(`fonts/${font.url}`);
  for (const type of ['input','delete','system']) if (config.keySound?.[type]) requireFile(`sound/${config.keySound[type]}`);
  for (const sound of config.keySound?.actions || []) if (sound.url) requireFile(`sound/${sound.url}`);
  function checkResources(value, theme) {
    if (!value || typeof value !== 'object') return;
    if (value.buttonStyleType === 'fileImage') for (const key of ['normalImage','highlightImage']) {
      const image = value[key]; if (!image) continue;
      if (!image.file || !image.image) throw new Error('圖片引用需要同時提供 file 和 image。');
      const base = `${theme}/resources/${image.file}`; requireFile(`${base}.png`);requireFile(`${base}.yaml`);
      const sprites = parseNativeYaml(new TextDecoder().decode(entries[`${base}.yaml`]));
      if (!Object.hasOwn(sprites,image.image)) throw new Error(`${base}.yaml 找不到圖片切片 ${image.image}`);
    }
    if (['cartoon','physics'].includes(value.animationType)) for (const file of value.images || []) requireFile(`${theme}/resources/${file}`);
    for (const child of Object.values(value)) checkResources(child,theme);
  }
  for (const {root,theme} of nativeRoots)checkResources(root,theme);
  return entries;
}
export function exportArchive(p,demoPng) {
  const root = safeName(p.meta.name);
  return zipSync(Object.fromEntries(Object.entries(packageEntries(p,demoPng)).map(([path,bytes]) => [`${root}/${path}`,bytes])),{level:6});
}
