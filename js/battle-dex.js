/**
 * Pokemon Showdown Dex
 *
 * Roughly equivalent to sim/dex.js in a Pokemon Showdown server, but
 * designed for use in browsers rather than in Node.
 *
 * This is a generic utility library for Pokemon Showdown code: any
 * code shared between the replay viewer and the client usually ends up
 * here.
 *
 * Licensing note: PS's client has complicated licensing:
 * - The client as a whole is AGPLv3
 * - The battle replay/animation engine (battle-*.ts) by itself is MIT
 *
 * Compiled into battledata.js which includes all dependencies
 *
 * @author Guangcong Luo <guangcongluo@gmail.com>
 * @license MIT
 */




if(typeof window==='undefined'){

global.window=global;
}else{

window.exports=window;
}


window.nodewebkit=!!(typeof process!=='undefined'&&process.versions&&process.versions['node-webkit']);

function toID(text){var _text,_text2;
if((_text=text)!=null&&_text.id){
text=text.id;
}else if((_text2=text)!=null&&_text2.userid){
text=text.userid;
}
if(typeof text!=='string'&&typeof text!=='number')return'';
return(''+text).toLowerCase().replace(/[^a-z0-9]+/g,'');
}

function toUserid(text){
return toID(text);
}


var PSUtils=new(function(){function _class(){}var _proto=_class.prototype;_proto.










splitFirst=function splitFirst(str,delimiter){var limit=arguments.length>2&&arguments[2]!==undefined?arguments[2]:1;
var splitStr=[];
while(splitStr.length<limit){
var delimiterIndex=str.indexOf(delimiter);
if(delimiterIndex>=0){
splitStr.push(str.slice(0,delimiterIndex));
str=str.slice(delimiterIndex+delimiter.length);
}else{
splitStr.push(str);
str='';
}
}
splitStr.push(str);
return splitStr;
};_proto.












compare=function compare(a,b){
if(typeof a==='number'){
return a-b;
}
if(typeof a==='string'){
return a.localeCompare(b);
}
if(typeof a==='boolean'){
return(a?1:2)-(b?1:2);
}
if(Array.isArray(a)){
for(var i=0;i<a.length;i++){
var comparison=PSUtils.compare(a[i],b[i]);
if(comparison)return comparison;
}
return 0;
}
if(a.reverse){
return PSUtils.compare(b.reverse,a.reverse);
}
throw new Error("Passed value "+a+" is not comparable");
};_proto.












sortBy=function sortBy(array,callback){
if(!callback)return array.sort(PSUtils.compare);
return array.sort(function(a,b){return PSUtils.compare(callback(a),callback(b));});
};return _class;}())(
);





function toRoomid(roomid){
return roomid.replace(/[^a-zA-Z0-9-]+/g,'').toLowerCase();
}

function toName(name){
if(typeof name!=='string'&&typeof name!=='number')return'';
name=(''+name).replace(/[\|\s\[\]\,\u202e]+/g,' ').trim();
if(name.length>18)name=name.substr(0,18).trim();


name=name.replace(
/[\u0300-\u036f\u0483-\u0489\u0610-\u0615\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06ED\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]{3,}/g,
''
);
name=name.replace(/[\u239b-\u23b9]/g,'');

return name;
}






















var Dex=new(function(){function _class3(){var _this=this;this.
gen=9;this.
learnsetGenchar='a';this.
currentGen="gen"+this.gen;this.
modid=[this.currentGen,this.currentGen];this.
cache=null;this.

statNames=['hp','atk','def','spa','spd','spe'];this.
statNamesExceptHP=['atk','def','spa','spd','spe'];this.

pokeballs=null;this.

resourcePrefix=function(){var _window$document,_window$document$loca;
var prefix='';
if(((_window$document=window.document)==null?void 0:(_window$document$loca=_window$document.location)==null?void 0:_window$document$loca.protocol)!=='http:')prefix='https:';
return prefix+"//"+(window.Config?Config.routes.client:'play.pokemonshowdown.com')+"/";

}();this.

fxPrefix=function(){var _window$document2,_window$document2$loc;
var protocol=((_window$document2=window.document)==null?void 0:(_window$document2$loc=_window$document2.location)==null?void 0:_window$document2$loc.protocol)!=='http:'?'https:':'';
return protocol+"//"+(window.Config?Config.routes.client:'play.pokemonshowdown.com')+"/fx/";
}();this.

loadedSpriteData={xy:1,bw:0};this.
moddedDexes={};this.




























































































































moves={
get:function(nameOrMove){
if(nameOrMove&&typeof nameOrMove!=='string'){

return nameOrMove;
}
var name=nameOrMove||'';
var id=toID(nameOrMove);
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}
if(!window.BattleMovedex)window.BattleMovedex={};
var data=window.BattleMovedex[id];
if(data&&typeof data.exists==='boolean')return data;

if(!data&&id.substr(0,11)==='hiddenpower'&&id.length>11){
var _ref=/([a-z]*)([0-9]*)/.exec(id),hpWithType=_ref[1],hpPower=_ref[2];
data=Object.assign({},
window.BattleMovedex[hpWithType]||{},{
basePower:Number(hpPower)||60});

}
if(!data&&id.substr(0,6)==='return'&&id.length>6){
data=Object.assign({},
window.BattleMovedex['return']||{},{
basePower:Number(id.slice(6))});

}
if(!data&&id.substr(0,11)==='frustration'&&id.length>11){
data=Object.assign({},
window.BattleMovedex['frustration']||{},{
basePower:Number(id.slice(11))});

}

if(!data)data={exists:false};
var move=new Move(id,name,data);
if(move.exists)window.BattleMovedex[id]=move;
return move;
}
};this.







items={
get:function(nameOrItem){
if(nameOrItem&&typeof nameOrItem!=='string'){

return nameOrItem;
}
var name=nameOrItem||'';
var id=toID(nameOrItem);
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}
if(!window.BattleItems)window.BattleItems={};
var data=window.BattleItems[id];
if(data&&typeof data.exists==='boolean')return data;
if(!data)data={exists:false};
var item=new Item(id,name,data);
if(item.exists)window.BattleItems[id]=item;
return item;
}
};this.

abilities={
get:function(nameOrAbility){
if(nameOrAbility&&typeof nameOrAbility!=='string'){

return nameOrAbility;
}
var name=nameOrAbility||'';
var id=toID(nameOrAbility);
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}
if(!window.BattleAbilities)window.BattleAbilities={};
var data=window.BattleAbilities[id];
if(data&&typeof data.exists==='boolean')return data;
if(!data)data={exists:false};
var ability=new Ability(id,name,data);
if(ability.exists)window.BattleAbilities[id]=ability;
return ability;
}
};this.

species={
get:function(nameOrSpecies){
if(nameOrSpecies&&typeof nameOrSpecies!=='string'){

return nameOrSpecies;
}
var name=nameOrSpecies||'';
var id=toID(nameOrSpecies);
var formid=id;
if(!window.BattlePokedexAltForms)window.BattlePokedexAltForms={};
if(formid in window.BattlePokedexAltForms)return window.BattlePokedexAltForms[formid];
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}else if(window.BattlePokedex&&!(id in BattlePokedex)&&window.BattleBaseSpeciesChart){for(var _i2=0,_BattleBaseSpeciesCha2=
BattleBaseSpeciesChart;_i2<_BattleBaseSpeciesCha2.length;_i2++){var baseSpeciesId=_BattleBaseSpeciesCha2[_i2];
if(formid.startsWith(baseSpeciesId)){
id=baseSpeciesId;
break;
}
}
}
if(!window.BattlePokedex)window.BattlePokedex={};
var data=window.BattlePokedex[id];

var species;
if(data&&typeof data.exists==='boolean'){
species=data;
}else{
if(!data)data={exists:false};
if(!data.tier&&id.slice(-5)==='totem'){
data.tier=_this.species.get(id.slice(0,-5)).tier;
}
if(!data.tier&&data.baseSpecies&&toID(data.baseSpecies)!==id){
data.tier=_this.species.get(data.baseSpecies).tier;
}
species=new Species(id,name,data);
if(species.exists)window.BattlePokedex[id]=species;
}

if(species.cosmeticFormes){for(var _i4=0,_species$cosmeticForm2=
species.cosmeticFormes;_i4<_species$cosmeticForm2.length;_i4++){var forme=_species$cosmeticForm2[_i4];
if(toID(forme)===formid){
species=new Species(formid,name,Object.assign({},
species,{
name:forme,
forme:forme.slice(species.name.length+1),
baseForme:"",
baseSpecies:species.name,
otherFormes:null})
);
window.BattlePokedexAltForms[formid]=species;
break;
}
}
}

return species;
},

getFromPokemon:function(pokemon){
var species=pokemon.species||pokemon.speciesForme;
return _this.species.get(species);
}
};this.

types={
allCache:null,
get:function(type){
if(!type||typeof type==='string'){
var id=toID(type);
var name=id.substr(0,1).toUpperCase()+id.substr(1);
type=window.BattleTypeChart&&window.BattleTypeChart[id]||{};
if(type.damageTaken)type.exists=true;
if(!type.id)type.id=id;
if(!type.name)type.name=name;
if(!type.effectType){
type.effectType='Type';
}
}
return type;
},
all:function(){
if(_this.types.allCache)return _this.types.allCache;
var types=[];
for(var id in window.BattleTypeChart||{}){
types.push(Dex.types.get(id));
}
if(types.length)_this.types.allCache=types;
return types;
},
isName:function(name){
var id=toID(name);
if(name!==id.substr(0,1).toUpperCase()+id.substr(1))return false;
return(window.BattleTypeChart||{}).hasOwnProperty(id);
}
};}var _proto2=_class3.prototype;_proto2.parseFormatid=function parseFormatid(formatid){var modids=[];var genStrings=formatid.match(/gen\d/);var gen=genStrings?genStrings[0]:this.currentGen;if(formatid.includes('anythinggoes')||formatid.endsWith('ag'))modids.push('anythinggoes');if(formatid.includes('doubles')||formatid.includes('freeforall')||formatid.startsWith(gen+'ffa')||formatid.includes('multibattle'))modids.push('doubles');if(formatid.includes('littlecup')||formatid.endsWith('lc'))modids.push('littlecup');if(formatid.includes('nfe'))modids.push('nfe');if(formatid.match(/\d\d\dcup/))modids.push(formatid.match(/\d\d\dcup/)[0]);if(formatid.includes('almostanyability')||formatid.includes('aaa'))modids.push('almostanyability');if(formatid.includes('categoryswap'))modids.push('categoryswap');if(formatid.includes('hackmons')||formatid.endsWith('bh'))modids.push('hackmons');if(formatid.includes('metronome'))modids.push('metronome');if(formatid.includes('scalemons'))modids.push('scalemons');if(formatid.includes('stabmons')||formatid.includes('staaabmons'))modids.push('stabmons');if(formatid.includes('thecardgame'))modids.push('thecardgame');if(formatid.includes('createmons'))modids.push('createmons');if(formatid.includes('crossevolution'))modids.push('crossevolution');if(formatid.includes('infinitefusion'))modids.push('infinitefusion');if(formatid.includes('fortemons')||formatid.includes('moveitemability'))modids.push('fortemons');if(formatid.includes('trademarked')||formatid.includes('moveitemability'))modids.push('trademarked');if(formatid.includes('multibility')||formatid.includes('moveitemability'))modids.push('multibility');if(formatid.includes('dualwielding')||formatid.includes('moveitemability'))modids.push('dualwielding');if(formatid.includes('monotype'))modids.push('monotype');if(formatid.includes('nationaldex')||formatid.includes('natdex')||formatid.startsWith(gen+'nd')||formatid.includes('metronome')||formatid.includes('createmons')||formatid.includes('infinitefusion')||formatid.includes('morebalancedhackmons'))modids.push('natdex');if(formatid.includes('letsgo'))modids.push('gen7letsgo');if(formatid.includes('bdsp'))modids.push('gen8bdsp');if(formatid.includes('morebalancedhackmons'))modids.push('gen9morebalancedhackmons');if(formatid.includes('digimon'))modids.push('digimon');var modpid=gen+modids.join('');return[modpid,gen].concat(modids);};_proto2.mod=function mod(formatid){var modids=this.parseFormatid(formatid);var modpid=modids[0];if(modpid===this.currentGen)return this;if(!window.BattleTeambuilderTable)return this;if(modpid in this.moddedDexes){return this.moddedDexes[modpid];}this.moddedDexes[modpid]=new ModdedDex(modids);return this.moddedDexes[modpid];};_proto2.forGen=function forGen(gen){if(!gen)return this;return this.mod("gen"+gen);};_proto2.resolveAvatar=function resolveAvatar(avatar){var _window$Config,_window$Config$server;if(window.BattleAvatarNumbers&&avatar in BattleAvatarNumbers){avatar=BattleAvatarNumbers[avatar];}if(avatar.charAt(0)==='#'){return Dex.resourcePrefix+'sprites/trainers-custom/'+toID(avatar.substr(1))+'.png';}if(avatar.includes('.')&&(_window$Config=window.Config)!=null&&(_window$Config$server=_window$Config.server)!=null&&_window$Config$server.registered){var protocol=Config.server.port===443?'https':'http';return protocol+'://'+Config.server.host+':'+Config.server.port+'/avatars/'+encodeURIComponent(avatar).replace(/\%3F/g,'?');}return Dex.resourcePrefix+'sprites/trainers/'+Dex.sanitizeName(avatar||'unknown')+'.png';};_proto2.sanitizeName=function sanitizeName(name){if(!name)return'';return(''+name).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').slice(0,50);};_proto2.prefs=function prefs(prop){var _window$Storage;return(_window$Storage=window.Storage)==null?void 0:_window$Storage.prefs==null?void 0:_window$Storage.prefs(prop);};_proto2.getShortName=function getShortName(name){var shortName=name.replace(/[^A-Za-z0-9]+$/,'');if(shortName.indexOf('(')>=0){shortName+=name.slice(shortName.length).replace(/[^\(\)]+/g,'').replace(/\(\)/g,'');}return shortName;};_proto2.getEffect=function getEffect(name){name=(name||'').trim();if(name.substr(0,5)==='item:'){return Dex.items.get(name.substr(5).trim());}else if(name.substr(0,8)==='ability:'){return Dex.abilities.get(name.substr(8).trim());}else if(name.substr(0,5)==='move:'){return Dex.moves.get(name.substr(5).trim());}var id=toID(name);return new PureEffect(id,name);};_proto2.getGen3Category=function getGen3Category(type){return['Fire','Water','Grass','Electric','Ice','Psychic','Dark','Dragon'].includes(type)?'Special':'Physical';};_proto2.

hasAbility=function hasAbility(species,ability){
for(var i in species.abilities){

if(ability===species.abilities[i])return true;
}
return false;
};_proto2.

loadSpriteData=function loadSpriteData(gen){
if(this.loadedSpriteData[gen])return;
this.loadedSpriteData[gen]=1;

var path=$('script[src*="pokedex-mini.js"]').attr('src')||'';
var qs='?'+(path.split('?')[1]||'');
path=(path.match(/.+?(?=data\/pokedex-mini\.js)/)||[])[0]||'';

var el=document.createElement('script');
el.src=path+'data/pokedex-mini-bw.js'+qs;
document.getElementsByTagName('body')[0].appendChild(el);
};_proto2.
getSpriteData=function getSpriteData(pokemon,isFront)







{var options=arguments.length>2&&arguments[2]!==undefined?arguments[2]:{gen:6};
var mechanicsGen=options.gen||6;
var isDynamax=!!options.dynamax;
if(pokemon instanceof Pokemon){

if(options.mod==='infinitefusion'&&!Dex.prefs('noif'))return this.getIFSpriteData(pokemon,isFront,options);
if(pokemon.volatiles.transform){
options.shiny=pokemon.volatiles.transform[2];
options.gender=pokemon.volatiles.transform[3];
}else{
options.shiny=pokemon.shiny;
options.gender=pokemon.gender;
}
var isGigantamax=false;
if(pokemon.volatiles.dynamax){
if(pokemon.volatiles.dynamax[1]){
isGigantamax=true;
}else if(options.dynamax!==false){
isDynamax=true;
}
}
pokemon=pokemon.getSpeciesForme()+(isGigantamax?'-Gmax':'');
}
var species=Dex.species.get(pokemon);

if(species.name.endsWith('-Gmax'))isDynamax=false;
var spriteData={
gen:mechanicsGen,
w:96,
h:96,
y:0,
url:Dex.resourcePrefix+'sprites/',
pixelated:true,
isFrontSprite:false,
cryurl:'',
shiny:options.shiny
};
var name=species.spriteid;
var dir;
var facing;
if(isFront){
spriteData.isFrontSprite=true;
dir='';
facing='front';
}else{
dir='-back';
facing='back';
}












var graphicsGen=mechanicsGen;
if(Dex.prefs('nopastgens'))graphicsGen=6;
if(Dex.prefs('bwgfx')&&graphicsGen>=6)graphicsGen=5;
spriteData.gen=Math.max(graphicsGen,Math.min(species.gen,5));
var baseDir=['','gen1','gen2','gen3','gen4','gen5','','','',''][spriteData.gen];

var animationData=null;
var miscData=null;
var speciesid=species.id;
if(species.isTotem)speciesid=toID(name);
if(baseDir===''&&window.BattlePokemonSprites){
animationData=BattlePokemonSprites[speciesid];
}
if(baseDir==='gen5'&&window.BattlePokemonSpritesBW){
animationData=BattlePokemonSpritesBW[speciesid];
}
if(window.BattlePokemonSprites)miscData=BattlePokemonSprites[speciesid];
if(!miscData&&window.BattlePokemonSpritesBW)miscData=BattlePokemonSpritesBW[speciesid];
if(!animationData)animationData={};
if(!miscData)miscData={};

if(miscData.num!==0&&miscData.num>-5000){
var baseSpeciesid=toID(species.baseSpecies);
spriteData.cryurl='audio/cries/'+baseSpeciesid;
var formeid=species.formeid;
if(species.isMega||formeid&&(
formeid==='-crowned'||
formeid==='-eternal'||
formeid==='-eternamax'||
formeid==='-four'||
formeid==='-hangry'||
formeid==='-hero'||
formeid==='-lowkey'||
formeid==='-noice'||
formeid==='-primal'||
formeid==='-rapidstrike'||
formeid==='-roaming'||
formeid==='-school'||
formeid==='-sky'||
formeid==='-starter'||
formeid==='-super'||
formeid==='-therian'||
formeid==='-unbound'||
baseSpeciesid==='calyrex'||
baseSpeciesid==='kyurem'||
baseSpeciesid==='cramorant'||
baseSpeciesid==='indeedee'||
baseSpeciesid==='lycanroc'||
baseSpeciesid==='necrozma'||
baseSpeciesid==='oinkologne'||
baseSpeciesid==='oricorio'||
baseSpeciesid==='slowpoke'||
baseSpeciesid==='tatsugiri'||
baseSpeciesid==='zygarde'))
{
spriteData.cryurl+=formeid;
}
spriteData.cryurl+='.mp3';
}

if(options.shiny&&mechanicsGen>1)dir+='-shiny';


if(window.Config&&Config.server&&Config.server.afd||options.afd){
dir='afd'+dir;
spriteData.url+=dir+'/'+name+'.png';


if(isDynamax&&!options.noScale){
spriteData.w*=0.25;
spriteData.h*=0.25;
spriteData.y+=-22;
}else if(species.isTotem&&!options.noScale){
spriteData.w*=0.5;
spriteData.h*=0.5;
spriteData.y+=-11;
}
return spriteData;
}


if(options.mod){
spriteData.cryurl="sprites/"+options.mod+"/audio/"+toID(species.baseSpecies);
spriteData.cryurl+='.mp3';
}

if(animationData[facing+'f']&&options.gender==='F')facing+='f';
var allowAnim=!Dex.prefs('noanim')&&!Dex.prefs('nogif');
if(allowAnim&&spriteData.gen>=6)spriteData.pixelated=false;
if(allowAnim&&animationData[facing]&&spriteData.gen>=5){
if(facing.slice(-1)==='f')name+='-f';
dir=baseDir+'ani'+dir;

spriteData.w=animationData[facing].w;
spriteData.h=animationData[facing].h;
spriteData.url+=dir+'/'+name+'.gif';
}else{


dir=(baseDir||'gen5')+dir;



if(spriteData.gen>=4&&miscData['frontf']&&options.gender==='F'){
name+='-f';
}

spriteData.url+=dir+'/'+name+'.png';
}

if(!options.noScale){
if(graphicsGen>4){

}else if(spriteData.isFrontSprite){
spriteData.w*=2;
spriteData.h*=2;
spriteData.y+=-16;
}else{

spriteData.w*=2/1.5;
spriteData.h*=2/1.5;
spriteData.y+=-11;
}
if(spriteData.gen<=2)spriteData.y+=2;
}
if(isDynamax&&!options.noScale){
spriteData.w*=2;
spriteData.h*=2;
spriteData.y+=-22;
}else if(species.isTotem&&!options.noScale){
spriteData.w*=1.5;
spriteData.h*=1.5;
spriteData.y+=-11;
}

return spriteData;
};_proto2.

getIFSpriteData=function getIFSpriteData(pokemon,isFront)

















{var options=arguments.length>2&&arguments[2]!==undefined?arguments[2]:{gen:6};

var spriteData={
gen:options.gen||9,
w:96,
h:96,
y:0,
url:Dex.resourcePrefix+'sprites/infinitefusion-battle/',
pixelated:true,
isFrontSprite:isFront,
cryurl:'',
shiny:false
};
if(!(pokemon instanceof Pokemon)){
spriteData.url+='1/1.1.png';
return spriteData;
}
if(pokemon.volatiles.transform)return this.getSpriteData(pokemon.volatiles.transform[1],isFront,options);
var headname=pokemon.details.split(', ').find(function(value){return value.startsWith('headname:');});
headname=headname?headname.slice(9):pokemon.name;

var headSpecies=Dex.species.get(headname);
var bodySpecies=Dex.species.get(pokemon.speciesForme);
if(!headSpecies.exists)return this.getSpriteData(pokemon,isFront,Object.assign({},options,{mod:undefined}));
var headNum=headSpecies.num;
var bodyNum=bodySpecies.num;

var specialFusions={
'kyuremblack':[644,646],
'kyuremwhite':[643,646]
};
if(headSpecies.id in specialFusions){var _specialFusions$headS=specialFusions[headSpecies.id];headNum=_specialFusions$headS[0];bodyNum=_specialFusions$headS[1];}
spriteData.url+=headNum+"/"+headNum+"."+bodyNum+".png";
spriteData.cryurl="audio/cries/"+headSpecies.id+".mp3";

var request=new XMLHttpRequest();
var found=false;
request.onreadystatechange=function(){
if(request.readyState===4){
if(request.status===200){
found=true;
}
}
};
try{
request.open('HEAD',spriteData.url,false);
request.send();
}catch(e){}
if(!found)return this.getSpriteData(pokemon,isFront,Object.assign({},options,{mod:undefined}));


if(!options.noScale){
if(spriteData.isFrontSprite){

spriteData.w*=1;
spriteData.h*=1;
spriteData.y+=-10;
}else{


spriteData.w*=1.5;
spriteData.h*=1.5;
spriteData.y+=-5;
}
}

return spriteData;
};_proto2.

getPokemonIconNum=function getPokemonIconNum(id,isFemale,facingLeft){var _window$BattlePokemon,_window$BattlePokemon2,_window$BattlePokedex,_window$BattlePokedex2,_window$BattlePokemon3;
var num=0;
if((_window$BattlePokemon=window.BattlePokemonSprites)!=null&&(_window$BattlePokemon2=_window$BattlePokemon[id])!=null&&_window$BattlePokemon2.num){
num=BattlePokemonSprites[id].num;
}else if((_window$BattlePokedex=window.BattlePokedex)!=null&&(_window$BattlePokedex2=_window$BattlePokedex[id])!=null&&_window$BattlePokedex2.num){
num=BattlePokedex[id].num;
}
if(num<0)num=0;
if(num>1017)num=0;

if((_window$BattlePokemon3=window.BattlePokemonIconIndexes)!=null&&_window$BattlePokemon3[id]){
num=BattlePokemonIconIndexes[id];
}

if(isFemale){
if(['unfezant','frillish','jellicent','meowstic','pyroar'].includes(id)){
num=BattlePokemonIconIndexes[id+'f'];
}
}
if(facingLeft){
if(BattlePokemonIconIndexesLeft[id]){
num=BattlePokemonIconIndexesLeft[id];
}
}
return num;
};_proto2.

getPokemonIcon=function getPokemonIcon(pokemon,facingLeft){var _pokemon,_pokemon2,_pokemon3,_pokemon3$volatiles,_pokemon4,_pokemon5;
if(pokemon==='pokeball'){
return"background:transparent url("+Dex.resourcePrefix+"sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -0px 4px";
}else if(pokemon==='pokeball-statused'){
return"background:transparent url("+Dex.resourcePrefix+"sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -40px 4px";
}else if(pokemon==='pokeball-fainted'){
return"background:transparent url("+Dex.resourcePrefix+"sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -80px 4px;opacity:.4;filter:contrast(0)";
}else if(pokemon==='pokeball-none'){
return"background:transparent url("+Dex.resourcePrefix+"sprites/pokemonicons-pokeball-sheet.png) no-repeat scroll -80px 4px";
}

var id=toID(pokemon);
if(!pokemon||typeof pokemon==='string')pokemon=null;

if((_pokemon=pokemon)!=null&&_pokemon.speciesForme)id=toID(pokemon.speciesForme);

if((_pokemon2=pokemon)!=null&&_pokemon2.species)id=toID(pokemon.species);

if((_pokemon3=pokemon)!=null&&(_pokemon3$volatiles=_pokemon3.volatiles)!=null&&_pokemon3$volatiles.formechange&&!pokemon.volatiles.transform){

id=toID(pokemon.volatiles.formechange[1]);
}
var num=this.getPokemonIconNum(id,((_pokemon4=pokemon)==null?void 0:_pokemon4.gender)==='F',facingLeft);

var top=Math.floor(num/12)*30;
var left=num%12*40;
var fainted=(_pokemon5=pokemon)!=null&&_pokemon5.fainted?";opacity:.3;filter:grayscale(100%) brightness(.5)":"";
return"background:transparent url("+Dex.resourcePrefix+"sprites/pokemonicons-sheet.png?v14) no-repeat scroll -"+left+"px -"+top+"px"+fainted;
};_proto2.

getTeambuilderSpriteData=function getTeambuilderSpriteData(pokemon){var gen=arguments.length>1&&arguments[1]!==undefined?arguments[1]:0;
var id=toID(pokemon.species);
var spriteid=pokemon.spriteid;
var species=Dex.species.get(pokemon.species);
if(pokemon.species&&!spriteid){
spriteid=species.spriteid||toID(pokemon.species);
}
if(species.exists===false){
var modSpecies=Dex.mod('digimon').species.get(pokemon.species);
if(modSpecies.exists===true){
var modSpriteData={
spriteid:modSpecies.id,
spriteDir:'sprites/digimon/dex',
x:-6,
y:0
};
if([
'andromon','angewomon','bakemon','darktyranomon','geremon','hiandromon','numemon',
'rosemon'].
includes(id))modSpriteData.y=14;
if([
'agumon','agumonblack','blackwargreymon','boltmon','centalmon','deathmeramon','diablomon',
'garudamon','grappuleomon','ladydevimon','leomon','mastertyranomon','megaseadramon','plotmon',
'vamdemon','wargreymon','weregarurumon','weregarurumonblack','yukiagumon'].
includes(id))modSpriteData.y=7;
return modSpriteData;
}
return{spriteDir:'sprites/gen5',spriteid:'0',x:10,y:5};
}
var spriteData={
spriteid:spriteid,
spriteDir:'sprites/dex',
x:-2,
y:-3
};
if(pokemon.shiny)spriteData.shiny=true;
if(Dex.prefs('nopastgens'))gen=6;
if(Dex.prefs('bwgfx')&&gen>5)gen=5;
var xydexExists=!species.isNonstandard||species.isNonstandard==='Past'||species.isNonstandard==='CAP'||[
"pikachustarter","eeveestarter","meltan","melmetal","pokestarufo","pokestarufo2","pokestarbrycenman","pokestarmt","pokestarmt2","pokestargiant","pokestarhumanoid","pokestarmonster","pokestarf00","pokestarf002","pokestarspirit"].
includes(species.id);
if(species.gen===8&&species.isNonstandard!=='CAP')xydexExists=false;
if((!gen||gen>=6)&&xydexExists){
if(species.gen>=7){
spriteData.x=-6;
spriteData.y=-7;
}else if(id.substr(0,6)==='arceus'){
spriteData.x=-2;
spriteData.y=7;
}else if(id==='garchomp'){
spriteData.x=-2;
spriteData.y=2;
}else if(id==='garchompmega'){
spriteData.x=-2;
spriteData.y=0;
}
return spriteData;
}
spriteData.spriteDir='sprites/gen5';
if(gen<=1&&species.gen<=1)spriteData.spriteDir='sprites/gen1';else
if(gen<=2&&species.gen<=2)spriteData.spriteDir='sprites/gen2';else
if(gen<=3&&species.gen<=3)spriteData.spriteDir='sprites/gen3';else
if(gen<=4&&species.gen<=4)spriteData.spriteDir='sprites/gen4';
spriteData.x=10;
spriteData.y=5;
return spriteData;
};_proto2.


getIFTeambuilderSpriteData=function getIFTeambuilderSpriteData(pokemon){var gen=arguments.length>1&&arguments[1]!==undefined?arguments[1]:0;
var headSpecies=Dex.species.get(pokemon.name);
var bodySpecies=Dex.species.get(pokemon.species);
var headNum=headSpecies.num;
var bodyNum=bodySpecies.num;
if(!headSpecies.exists)return this.getTeambuilderSpriteData(pokemon,gen);
var spriteData={
spriteid:headNum+"/"+headNum+"."+bodyNum,
spriteDir:'sprites/infinitefusion',
x:-2,
y:-3
};
var url=Dex.resourcePrefix+'sprites/infinitefusion/'+spriteData.spriteid+'.png';
var request=new XMLHttpRequest();
request.onreadystatechange=function(){
if(request.readyState===4){
if(request.status===200){
spriteData.shiny=false;
}else{
spriteData.shiny=true;
}
}
};
try{
request.open('HEAD',url,false);
request.send();
}catch(e){}

return spriteData;
};_proto2.

getTeambuilderSprite=function getTeambuilderSprite(pokemon){var gen=arguments.length>1&&arguments[1]!==undefined?arguments[1]:0;
if(!pokemon)return'';

var data=pokemon.isIF&&!Dex.prefs('noif')?this.getIFTeambuilderSpriteData(pokemon,gen):this.getTeambuilderSpriteData(pokemon,gen);
if(pokemon.isIF&&data.shiny)return data.spriteid.split('/')[1];
var shiny=data.shiny?'-shiny':'';
return'background-image:url('+Dex.resourcePrefix+data.spriteDir+shiny+'/'+data.spriteid+'.png);background-position:'+data.x+'px '+data.y+'px;background-repeat:no-repeat';
};_proto2.

getItemIcon=function getItemIcon(item){var _item;
var num=0;
if(typeof item==='string'&&exports.BattleItems)item=exports.BattleItems[toID(item)];
if((_item=item)!=null&&_item.spritenum)num=item.spritenum;

var top=Math.floor(num/16)*24;
var left=num%16*24;
return'background:transparent url('+Dex.resourcePrefix+'sprites/itemicons-sheet.png?v1) no-repeat scroll -'+left+'px -'+top+'px';
};_proto2.

getTypeIcon=function getTypeIcon(type,b){
type=this.types.get(type).name;
if(!type)type='???';
var sanitizedType=type.replace(/\?/g,'%3f');
return"<img src=\""+Dex.resourcePrefix+"sprites/types/"+sanitizedType+".png\" alt=\""+type+"\" height=\"14\" width=\"32\" class=\"pixelated"+(b?' b':'')+"\" />";
};_proto2.

getCategoryIcon=function getCategoryIcon(category){
var categoryID=toID(category);
var sanitizedCategory='';
switch(categoryID){
case'physical':
case'special':
case'status':
sanitizedCategory=categoryID.charAt(0).toUpperCase()+categoryID.slice(1);
break;
default:
sanitizedCategory='undefined';
break;
}
return"<img src=\""+Dex.resourcePrefix+"sprites/categories/"+sanitizedCategory+".png\" alt=\""+sanitizedCategory+"\" height=\"14\" width=\"32\" class=\"pixelated\" />";
};_proto2.

getPokeballs=function getPokeballs(){
if(this.pokeballs)return this.pokeballs;
this.pokeballs=[];
if(!window.BattleItems)window.BattleItems={};for(var _i6=0,_ref3=
Object.values(window.BattleItems);_i6<_ref3.length;_i6++){var _data=_ref3[_i6];
if(!_data.isPokeball)continue;
this.pokeballs.push(_data.name);
}
return this.pokeballs;
};_proto2.

getTierSetTable=function getTierSetTable(){
return window.BattleTeambuilderTable;
};_proto2.
getLearnsetTable=function getLearnsetTable(){
return window.BattleTeambuilderTable;
};_proto2.

getMovedex=function getMovedex(){
return window.BattleMovedex;
};_proto2.

getTierSet=function getTierSet(){
var table=this.getTierSetTable();
if(!table.tierSet){
table.tierSet=table.tiers.map(function(r){
if(typeof r==='string')return['pokemon',r];
return[r[0],r[1]];
});
table.tiers=null;
}
return table.tierSet.slice(table.formatSlices.AG);
};_proto2.

getItemSet=function getItemSet(){
var table=BattleTeambuilderTable;
if(!table.itemSet){
table.itemSet=table.items.map(function(r){
if(typeof r==='string'){
return['item',r];
}
return[r[0],r[1]];
});
table.items=null;
}
return table.itemSet;
};_proto2.

firstLearnsetid=function firstLearnsetid(speciesid){
var table=this.getLearnsetTable();
if(speciesid in table.learnsets)return speciesid;
var species=this.species.get(speciesid);
if(!species.exists)return'';

var baseLearnsetid=toID(species.baseSpecies);
if(typeof species.battleOnly==='string'&&species.battleOnly!==species.baseSpecies){
baseLearnsetid=toID(species.battleOnly);
}
if(baseLearnsetid in table.learnsets)return baseLearnsetid;
return'';
};_proto2.
nextLearnsetid=function nextLearnsetid(learnsetid,speciesid){
if(learnsetid==='lycanrocdusk'||speciesid==='rockruff'&&learnsetid==='rockruff'){
return'rockruffdusk';
}
var lsetSpecies=this.species.get(learnsetid);
if(!lsetSpecies.exists)return'';

if(lsetSpecies.id==='gastrodoneast')return'gastrodon';
if(lsetSpecies.id==='pumpkaboosuper')return'pumpkaboo';
if(lsetSpecies.id==='sinisteaantique')return'sinistea';

var next=lsetSpecies.battleOnly||lsetSpecies.changesFrom||lsetSpecies.prevo;
if(next)return toID(next);

return'';
};_proto2.
canLearn=function canLearn(speciesid,moveid){
var move=this.moves.get(moveid);
var learnsetid=this.firstLearnsetid(speciesid);
while(learnsetid){
var table=this.getLearnsetTable();
var _learnset=table.learnsets[learnsetid];
if(
_learnset&&moveid in _learnset&&(

_learnset[moveid].includes(this.learnsetGenchar)||
_learnset[moveid].includes(""+(this.gen+1))&&move.gen===this.gen))

{
return true;
}
learnsetid=this.nextLearnsetid(learnsetid,speciesid);
}
return false;
};_proto2.
getLearnsetMoves=function getLearnsetMoves(pokemon){
var moveDex=window.BattleMovedex;
var moves=[];
var sketch=false;
for(var id in moveDex){
if(!this.canLearn(toID(pokemon.species),id))continue;
if(id==='sketch')sketch=true;
moves.push(id);
}
if(sketch){
for(var _id in moveDex){
if(moves.includes(_id))continue;
var move=this.moves.get(_id);
if(move.isNonstandard)continue;
if(move.noSketch||move.isMax||move.isZ)continue;
moves.push(_id);
}
}
return moves;
};_proto2.

getTypeSet=function getTypeSet(){
var results=[];
for(var id in window.BattleTypeChart){
results.push(['type',id]);
}
return results;
};return _class3;}())(
);var

ModdedDex=function(){










function ModdedDex(modids){var _this2=this;this.gen=void 0;this.modid=void 0;this.cache={Moves:{},Items:{},Abilities:{},Species:{},Types:{}};this.pokeballs=null;this.



moves={
get:function(name){
var id=toID(name);
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}
if(_this2.cache.Moves.hasOwnProperty(id))return _this2.cache.Moves[id];

var data=Object.assign({},Dex.moves.get(name));

for(var i=Dex.gen-1;i>=_this2.gen;i--){
var table=window.BattleTeambuilderTable["gen"+i];
if(id in table.overrideMoveData){
Object.assign(data,table.overrideMoveData[id]);
}
}
if(_this2.gen<=3&&data.category!=='Status'){
data.category=Dex.getGen3Category(data.type);
}for(var _i8=0,_this2$modid2=
_this2.modid;_i8<_this2$modid2.length;_i8++){var _ModModifier$mid;var mid=_this2$modid2[_i8];
if((_ModModifier$mid=ModModifier[mid])!=null&&_ModModifier$mid.movesMod)ModModifier[mid].movesMod(data,_this2);
}

var move=new Move(id,name,data);
if(move.exists)_this2.cache.Moves[id]=move;
return move;
}
};this.

items={
get:function(name){
var id=toID(name);
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}
if(_this2.cache.Items.hasOwnProperty(id))return _this2.cache.Items[id];

var data=Object.assign({},Dex.items.get(name));

for(var i=_this2.gen;i<9;i++){
var table=window.BattleTeambuilderTable['gen'+i];
if(id in table.overrideItemDesc){
data.shortDesc=table.overrideItemDesc[id];
break;
}
}for(var _i10=0,_this2$modid4=
_this2.modid;_i10<_this2$modid4.length;_i10++){var _ModModifier$mid2;var mid=_this2$modid4[_i10];
if((_ModModifier$mid2=ModModifier[mid])!=null&&_ModModifier$mid2.itemsMod)ModModifier[mid].itemsMod(data,_this2);
}

var item=new Item(id,name,data);
if(item.exists)_this2.cache.Items[id]=item;
return item;
}
};this.

abilities={
get:function(name){
var id=toID(name);
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}
if(_this2.cache.Abilities.hasOwnProperty(id))return _this2.cache.Abilities[id];

var data=Object.assign({},Dex.abilities.get(name));

for(var i=Dex.gen-1;i>=_this2.gen;i--){
var table=window.BattleTeambuilderTable["gen"+i];
if(id in table.overrideAbilityData){
Object.assign(data,table.overrideAbilityData[id]);
}
}for(var _i12=0,_this2$modid6=
_this2.modid;_i12<_this2$modid6.length;_i12++){var _ModModifier$mid3;var mid=_this2$modid6[_i12];
if((_ModModifier$mid3=ModModifier[mid])!=null&&_ModModifier$mid3.abilitiesMod)ModModifier[mid].abilitiesMod(data,_this2);
}

var ability=new Ability(id,name,data);
if(ability.exists)_this2.cache.Abilities[id]=ability;
return ability;
}
};this.

species={
get:function(name){
var id=toID(name);
if(window.BattleAliases&&id in BattleAliases){
name=BattleAliases[id];
id=toID(name);
}
if(_this2.cache.Species.hasOwnProperty(id))return _this2.cache.Species[id];

var data=Object.assign({},Dex.species.get(name));

for(var i=Dex.gen-1;i>=_this2.gen;i--){
var table=window.BattleTeambuilderTable["gen"+i];
if(id in table.overrideSpeciesData){
Object.assign(data,table.overrideSpeciesData[id]);
}
}
if(_this2.gen<3){
data.abilities={0:"No Ability"};
}for(var _i14=0,_this2$modid8=
_this2.modid;_i14<_this2$modid8.length;_i14++){var _ModModifier$mid4;var mid=_this2$modid8[_i14];
if((_ModModifier$mid4=ModModifier[mid])!=null&&_ModModifier$mid4.speciesMod)ModModifier[mid].speciesMod(data,_this2);
}
if(!data.tier&&id.slice(-5)==='totem'){
data.tier=_this2.species.get(id.slice(0,-5)).tier;
}
if(!data.tier&&data.baseSpecies&&toID(data.baseSpecies)!==id){
data.tier=_this2.species.get(data.baseSpecies).tier;
}
if(data.gen>_this2.gen)data.tier='Illegal';

var species=new Species(id,name,data);
if(species.exists)_this2.cache.Species[id]=species;
return species;
},

getFromPokemon:function(pokemon,extra){for(var _i16=0,_this2$modid10=
_this2.modid;_i16<_this2$modid10.length;_i16++){var _ModModifier$mid5;var mid=_this2$modid10[_i16];
if((_ModModifier$mid5=ModModifier[mid])!=null&&_ModModifier$mid5.ModifySpecies)return ModModifier[mid].ModifySpecies(pokemon,_this2,extra);
}
var species=pokemon.species||pokemon.speciesForme;
return _this2.species.get(species);
}
};this.

types={
get:function(name){
var id=toID(name);
name=id.substr(0,1).toUpperCase()+id.substr(1);

if(_this2.cache.Types.hasOwnProperty(id))return _this2.cache.Types[id];

var data=Object.assign({},Dex.types.get(name));

for(var i=7;i>=_this2.gen;i--){
var table=window.BattleTeambuilderTable['gen'+i];
if(id in table.removeType){
data.exists=false;

break;
}
if(id in table.overrideTypeChart){
data=Object.assign({},data,table.overrideTypeChart[id]);
}
}for(var _i18=0,_this2$modid12=
_this2.modid;_i18<_this2$modid12.length;_i18++){var _ModModifier$mid6;var mid=_this2$modid12[_i18];
if((_ModModifier$mid6=ModModifier[mid])!=null&&_ModModifier$mid6.typesMod)ModModifier[mid].typesMod(data);
}

if(data.exists)_this2.cache.Types[id]=data;
return data;
}
};this.gen=parseInt(modids[1].slice(3),10);this.modid=modids.slice(2);}var _proto3=ModdedDex.prototype;_proto3.

getPokeballs=function getPokeballs(){
if(this.pokeballs)return this.pokeballs;
this.pokeballs=[];
if(!window.BattleItems)window.BattleItems={};for(var _i20=0,_ref5=
Object.values(window.BattleItems);_i20<_ref5.length;_i20++){var _data2=_ref5[_i20];
if(_data2.gen&&_data2.gen>this.gen)continue;
if(!_data2.isPokeball)continue;
this.pokeballs.push(_data2.name);
}
return this.pokeballs;
};_proto3.

getTierSetTable=function getTierSetTable(){


var BTTable=window.BattleTeambuilderTable;
var table=BTTable;
if(this.gen<Dex.gen)table=BTTable["gen"+this.gen];
if(this.modid.includes('doubles'))table=BTTable["gen"+this.gen+"doubles"];
if(this.modid.includes('littlecup'))table=BTTable["gen"+this.gen+"lc"];
if(this.modid.includes('nfe'))table=BTTable["gen"+this.gen+"nfe"];
if(this.gen===9&&this.modid.includes('hackmons'))table=BTTable["bh"];
if(this.modid.includes('natdex'))table=BTTable["gen"+this.gen+"natdex"];
if(this.modid.includes('gen7letsgo'))table=BTTable['gen7letsgo'];
if(this.modid.includes('gen8bdsp'))table=BTTable['gen8bdsp'];
if(this.modid.includes('digimon'))table=window.DigimonTable;
return table;
};_proto3.
getLearnsetTable=function getLearnsetTable(){
if(this.modid.includes('gen7letsgo'))return window.BattleTeambuilderTable['gen7letsgo'];
if(this.modid.includes('gen8bdsp'))return window.BattleTeambuilderTable['gen8bdsp'];
if(this.modid.includes('digimon'))return window.DigimonTable;
return window.BattleTeambuilderTable;
};_proto3.

getMovedex=function getMovedex(){
if(this.modid.includes('digimon'))return window.DigiMovedex;
return window.BattleMovedex;
};_proto3.

getTierSet=function getTierSet(){

var table=this.getTierSetTable();
if(!table.tierSet){
table.tierSet=table.tiers.map(function(r){
if(typeof r==='string')return['pokemon',r];
return[r[0],r[1]];
});
table.tiers=null;
}
var slices=table.formatSlices;
var tierSet=table.tierSet.slice(slices.AG||slices.Uber||slices.DUber);

var modified=false;for(var _i22=0,_this$modid2=
this.modid;_i22<_this$modid2.length;_i22++){var _ModModifier$mid7;var mid=_this$modid2[_i22];
if((_ModModifier$mid7=ModModifier[mid])!=null&&_ModModifier$mid7.ModifyTierSet){
tierSet=ModModifier[mid].ModifyTierSet(tierSet,this,slices);
modified=true;
}
}
if(!modified){
if(!this.modid.includes('doubles'))tierSet=[].concat(
table.tierSet.slice(slices.OU,slices.UU),
table.tierSet.slice(slices.AG,slices.Uber),
table.tierSet.slice(slices.Uber,slices.OU),
table.tierSet.slice(slices.UU));else

tierSet=[].concat(
tierSet.slice(slices.DOU,slices.DUU),
tierSet.slice(slices.DUber,slices.DOU),
tierSet.slice(slices.DUU));

}
return tierSet;
};_proto3.

getItemSet=function getItemSet(){
var table=BattleTeambuilderTable;
var petmods=['natdex','gen8bdsp','digimon','metronome'];for(var _i24=0,_this$modid4=
this.modid;_i24<_this$modid4.length;_i24++){var mid=_this$modid4[_i24];
if(!petmods.includes(mid))continue;
var _mid=mid;
if(['natdex','metronome'].includes(_mid))_mid="gen"+this.gen+_mid;
table=_mid==='digimon'?window.DigimonTable:window.BattleTeambuilderTable[_mid];
if(table)break;
}
if(this.gen<Dex.gen)table=window.BattleTeambuilderTable["gen"+this.gen];
if(!table.itemSet){
table.itemSet=table.items.map(function(r){
if(typeof r==='string'){
return['item',r];
}
return[r[0],r[1]];
});
table.items=null;
}
return table.itemSet;
};_proto3.



firstLearnsetid=function firstLearnsetid(speciesid){
var table=this.getLearnsetTable();
if(speciesid in table.learnsets)return speciesid;
var species=this.species.get(speciesid);
if(!species.exists)return'';

var baseLearnsetid=toID(species.baseSpecies);
if(typeof species.battleOnly==='string'&&species.battleOnly!==species.baseSpecies){
baseLearnsetid=toID(species.battleOnly);
}
if(baseLearnsetid in table.learnsets)return baseLearnsetid;
return'';
};_proto3.
nextLearnsetid=function nextLearnsetid(learnsetid,speciesid){
if(learnsetid==='lycanrocdusk'||speciesid==='rockruff'&&learnsetid==='rockruff'){
return'rockruffdusk';
}
var lsetSpecies=this.species.get(learnsetid);
if(!lsetSpecies.exists)return'';

if(lsetSpecies.id==='gastrodoneast')return'gastrodon';
if(lsetSpecies.id==='pumpkaboosuper')return'pumpkaboo';
if(lsetSpecies.id==='sinisteaantique')return'sinistea';
if(lsetSpecies.id==='tatsugiristretchy')return'tatsugiri';

var next=lsetSpecies.battleOnly||lsetSpecies.changesFrom||lsetSpecies.prevo;
if(next)return toID(next);

return'';
};_proto3.
canLearn=function canLearn(speciesid,moveid){

var move=this.moves.get(moveid);
var isNatDex=this.modid.includes('natdex');
if(isNatDex&&move.isNonstandard&&move.isNonstandard!=='Past'){
return false;
}
var gen=this.gen;
var genCharTable=['0','1','2','3','4','5','p','q','g','a'];
var genChar=gen===9&&!isNatDex?genCharTable[gen]:""+gen;
var learnsetid=this.firstLearnsetid(speciesid);
while(learnsetid){
var table=this.getLearnsetTable();
var _learnset2=table.learnsets[learnsetid];
if(_learnset2&&moveid in _learnset2&&(
_learnset2[moveid].includes(genChar)||_learnset2[moveid].includes(""+(gen+1))&&move.gen===gen)){
return true;
}
learnsetid=this.nextLearnsetid(learnsetid,speciesid);
}
return false;
};_proto3.
getLearnsetMoves=function getLearnsetMoves(pokemon){
var moveDex=this.getMovedex();
var moves=[];
var sketch=false;
for(var id in moveDex){
if(!this.canLearn(toID(pokemon.species),id))continue;
if(id==='sketch')sketch=true;
moves.push(id);
}
if(sketch){
for(var _id2 in moveDex){
if(moves.includes(_id2))continue;
var move=this.moves.get(_id2);
if(move.isNonstandard)continue;
if(move.noSketch||move.isMax||move.isZ)continue;
moves.push(_id2);
}
}for(var _i26=0,_this$modid6=
this.modid;_i26<_this$modid6.length;_i26++){var _ModModifier$mid8;var mid=_this$modid6[_i26];
if((_ModModifier$mid8=ModModifier[mid])!=null&&_ModModifier$mid8.ModifyLearnset)moves=ModModifier[mid].ModifyLearnset(pokemon,this,moves);
}
return moves;
};_proto3.

getTypeSet=function getTypeSet(){
var results=[];
var chart=this.modid.includes('digimon')?window.DigiTypeChart:window.BattleTypeChart;
for(var id in chart){
results.push(['type',id]);
}
return results;
};return ModdedDex;}();









var ModModifier=










{

anythinggoes:{
ModifyTierSet:function(tierSet,dex,extra){return tierSet;}
},
doubles:{
speciesMod:function(data,extra){
var gen=9;
if(extra&&extra.gen)gen=extra.gen;
var table=window.BattleTeambuilderTable["gen"+gen+"doubles"];
if(data.id in table.overrideTier)data.tier=table.overrideTier[data.id];
}
},
littlecup:{
ModifyTierSet:function(tierSet,dex,extra){return tierSet.slice(
tierSet.findIndex(function(_ref6){var type=_ref6[0],value=_ref6[1];return type==='header'&&value==='LC';})
);}
},
nfe:{
ModifyTierSet:function(tierSet,dex,extra){return tierSet.slice(
tierSet.findIndex(function(_ref7){var type=_ref7[0],value=_ref7[1];return type==='header'&&value==='NFEs not in a higher tier';})
);}
},

'350cup':{
speciesMod:function(data){
if(!data.exists)return;
if(data.bst>350)return;
data.bst=0;
var newStats=Object.assign({},data.baseStats);
for(var stat in data.baseStats){
newStats[stat]=data.baseStats[stat]*2;
if(newStats[stat]<1)newStats[stat]=1;
if(newStats[stat]>255)newStats[stat]=255;
data.bst+=newStats[stat];
}
data.baseStats=newStats;
},
ModifyTierSet:function(tierSet,dex,extra){return tierSet;}
},
'500cup':{
ModifyTierSet:function(tierSet,dex,extra){return tierSet.filter(
function(_ref8){var type=_ref8[0],id=_ref8[1];
if(type==='pokemon'){
var bst=dex.species.get(id).bst;
if(bst>500)return false;
}
return true;
}
);}
},
'600cup':{
ModifyTierSet:function(tierSet,dex,extra){return tierSet.filter(
function(_ref9){var type=_ref9[0],id=_ref9[1];
if(type==='pokemon'){
var bst=dex.species.get(id).bst;
if(bst>600)return false;
}
return true;
}
);}
},
categoryswap:{
movesMod:function(data){
if(!data.exists)return;
var categoryMap={
'Physical':'Special',
'Special':'Physical',
'Status':'Status'
};
data.category=categoryMap[data.category];
}
},
hackmons:{
ModifyTierSet:function(tierSet,dex,extra){return tierSet;},
ModifyLearnset:function(pokemon,dex,learnset){
var moveDex=dex.getMovedex();
var isNatDex=dex.modid.includes('natdex');
var isLGPE=dex.modid.includes('gen7letsgo');
var moves=[];
for(var id in moveDex){
var move=dex.moves.get(id);

if(move.isNonstandard&&!['Unobtainable','LGPE'].includes(move.isNonstandard))continue;
if(move.isNonstandard==='LGPE'&&!isLGPE)continue;
if(move.isMax&&dex.gen>8&&!isNatDex)continue;
if(typeof move.isMax==='string')continue;
if(move.isZ&&dex.gen>7&&!isNatDex)continue;
moves.push(id);
}
return moves;
}
},
metronome:{
speciesMod:function(data){
if(data.num>=0)data.tier=String(data.num);
},
ModifyTierSet:function(tierSet,dex,extra){return tierSet;}
},
scalemons:{
speciesMod:function(data,extra){
if(!data.exists)return;
var cupName=extra&&extra.modid.find(function(id){return id.includes('cup');})||'600cup';
var goalBST=parseInt(cupName.slice(0,3));
var bstWithoutHp=data.bst-data.baseStats['hp'];
var scale=goalBST-data.baseStats['hp'];
data.bst=data.baseStats['hp'];
var newStats=Object.assign({},data.baseStats);
for(var stat in data.baseStats){
if(stat==='hp')continue;
newStats[stat]=Math.floor(data.baseStats[stat]*scale/bstWithoutHp);
if(newStats[stat]<1)newStats[stat]=1;
if(newStats[stat]>255)newStats[stat]=255;
data.bst+=newStats[stat];
}
data.baseStats=newStats;
},
ModifyTierSet:function(tierSet,dex,extra){return tierSet;}
},
stabmons:{
ModifyLearnset:function(pokemon,dex,learnset){
var moveDex=dex.getMovedex();
var isNatDex=dex.modid.includes('natdex');
var isLGPE=dex.modid.includes('gen7letsgo');
for(var id in moveDex){
if(learnset.includes(id))continue;
var move=dex.moves.get(id);
if(move.isNonstandard&&move.isNonstandard!=='Unobtainable')continue;
if(move.isZ||move.isMax)continue;

var species=dex.species.get(pokemon.species);
var speciesTypes=[];
var moveTypes=[];
for(var i=dex.gen;i>=species.gen&&i>=move.gen;i--){
var genDex=Dex.forGen(i);
moveTypes.push(genDex.moves.get(move.name).type);

var _pokemon6=genDex.species.get(species.name);
var baseSpecies=genDex.species.get(_pokemon6.changesFrom||_pokemon6.name);
if(!_pokemon6.battleOnly)speciesTypes.push.apply(speciesTypes,_pokemon6.types);
var prevo=_pokemon6.prevo;
while(prevo){
var prevoSpecies=genDex.species.get(prevo);
speciesTypes.push.apply(speciesTypes,prevoSpecies.types);
prevo=prevoSpecies.prevo;
}
if(_pokemon6.battleOnly&&typeof _pokemon6.battleOnly==='string'){
species=dex.species.get(_pokemon6.battleOnly);
}
var excludedForme=function(s){return[
'Alola','Alola-Totem','Galar','Galar-Zen','Hisui','Paldea','Paldea-Combat','Paldea-Blaze','Paldea-Aqua'].
includes(s.forme);};
if(baseSpecies.otherFormes&&!['Wormadam','Urshifu'].includes(baseSpecies.baseSpecies)){
if(!excludedForme(species))speciesTypes.push.apply(speciesTypes,baseSpecies.types);for(var _i28=0,_baseSpecies$otherFor2=
baseSpecies.otherFormes;_i28<_baseSpecies$otherFor2.length;_i28++){var formeName=_baseSpecies$otherFor2[_i28];
var forme=dex.species.get(formeName);
if(!forme.battleOnly&&!excludedForme(forme))speciesTypes.push.apply(speciesTypes,forme.types);
}
}
}
var valid=false;for(var _i30=0;_i30<
moveTypes.length;_i30++){var type=moveTypes[_i30];
if(speciesTypes.includes(type)){
valid=true;
break;
}
}
if(valid)learnset.push(id);
}
return learnset;
}
},
thecardgame:{
movesMod:function(data){
if(!data.exists)return;
data.type=data.type.
replace(/(Ghost|Fairy)/g,'Psychic').
replace(/Bug/g,'Grass').
replace(/Ice/g,'Water').
replace(/(Rock|Ground)/g,'Fighting').
replace(/Flying/g,'Normal').
replace(/Poison/g,'Dark');
},
speciesMod:function(data){
if(!data.exists)return;
data.types=Array.from(new Set(data.types.map(function(type){return(
type.replace(/(Ghost|Fairy)/g,'Psychic').
replace(/Bug/g,'Grass').
replace(/Ice/g,'Water').
replace(/(Rock|Ground)/g,'Fighting').
replace(/Flying/g,'Normal').
replace(/Poison/g,'Dark'));}
)));
}
},

createmons:{
ModifySpecies:function(pokemon,dex,extra){
var species=dex.species.get(pokemon.speciesForme||pokemon.species);

var evs=pokemon.evs;
var types=[pokemon.hpType,pokemon.teraType];

if(!evs){
var details=pokemon.details;
var crtmInfo=(details.split(', ').find(function(value){return value.startsWith('createmons:');})||'').slice(11);
if(crtmInfo){
evs={hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
var evsArray=crtmInfo.split(',').slice(0,6).map(Number);
var i;
for(i in evs)evs[i]=evsArray.shift()||0;
types=crtmInfo.split(',').slice(6);
}
}

if(!evs)return species;
types=Array.from(new Set(types));
return new Species(species.id,species.name,Object.assign({},species,{baseStats:evs,types:types}));
},
ModifyTierSet:function(tierSet,dex,extra){return tierSet;},
ModifyLearnset:function(pokemon,dex,learnset){
var moveDex=dex.getMovedex();
var moves=[];
for(var id in moveDex){
var move=dex.moves.get(id);
if(move.isNonstandard==='CAP')continue;
if(move.isMax||move.isZ)continue;
moves.push(id);
}
return moves;
}
},
crossevolution:{
ModifySpecies:function(pokemon,dex,extra){
var nameString=pokemon.name||'';

var speciesString=pokemon.species||pokemon.speciesForme;
var species=dex.species.get(speciesString);
if(nameString!==speciesString){
var crossSpecies=dex.species.get(nameString);
if(!!crossSpecies.exists&&crossSpecies.prevo){
var crossPrevoSpecies=dex.species.get(crossSpecies.prevo);
if(!crossPrevoSpecies.prevo===!species.prevo){
var mixedSpecies=Object.assign({},species);
mixedSpecies.bst=0;
var stat;
var newStats=Object.assign({},mixedSpecies.baseStats);
for(stat in mixedSpecies.baseStats){
newStats[stat]+=crossSpecies.baseStats[stat]-crossPrevoSpecies.baseStats[stat];
if(newStats[stat]<1)newStats[stat]=1;
if(newStats[stat]>255)newStats[stat]=255;
mixedSpecies.bst+=newStats[stat];
}
mixedSpecies.baseStats=newStats;
var newTypes=[].concat(mixedSpecies.types);
if(crossSpecies.types[0]!==crossPrevoSpecies.types[0])newTypes[0]=crossSpecies.types[0];
if(crossSpecies.types[1]!==crossPrevoSpecies.types[1])newTypes[1]=crossSpecies.types[1]||crossSpecies.types[0];
if(newTypes[0]===newTypes[1])newTypes=[newTypes[0]];
mixedSpecies.types=newTypes;
mixedSpecies.abilities=crossSpecies.abilities;
return new Species(mixedSpecies.id,mixedSpecies.name,Object.assign({},mixedSpecies));
}
}
}
return species;
},
ModifyLearnset:function(pokemon,dex,learnset){
var name=pokemon.name||'';
var crossSpecies=dex.species.get(name);
if(!crossSpecies.exists)return learnset;
var moveDex=dex.getMovedex();
for(var id in moveDex){
if(learnset.includes(id))continue;
if(dex.canLearn(crossSpecies.id,id))learnset.push(id);
}
return learnset;
}
},
infinitefusion:{
ModifySpecies:function(pokemon,dex,extra){
var name='';

if(pokemon.details){
var details=pokemon.details;
name=(details.split(', ').find(function(value){return value.startsWith('headname:');})||'').slice(9);
}
if(name===''){
name=pokemon.name||'';
}
var species=pokemon.species||pokemon.speciesForme;
var headSpecies=dex.species.get(name);
var bodySpecies=dex.species.get(species);
if(!headSpecies.exists||!bodySpecies.exists)return new Species(bodySpecies.id,bodySpecies.name,Object.assign({},bodySpecies));
if(headSpecies.baseSpecies!==headSpecies.name||bodySpecies.baseSpecies!==bodySpecies.name)return new Species(bodySpecies.id,bodySpecies.name,Object.assign({},bodySpecies));
var nonstandard=['CAP','Custom'];
if(headSpecies.isNonstandard&&nonstandard.includes(headSpecies.isNonstandard)||
bodySpecies.isNonstandard&&nonstandard.includes(bodySpecies.isNonstandard))
return new Species(bodySpecies.id,bodySpecies.name,Object.assign({},bodySpecies));
if(headSpecies.name===bodySpecies.name){
var specialSelfFusions={
deoxys:'Deoxys-Attack',
rotom:'Rotom-Heat',
shaymin:'Shaymin-Sky',
keldeo:'Keldeo-Resolute',
meloetta:'Meloetta-Pirouette',
greninja:'Greninja-Ash',
floette:'Floette-Eternal',
zygarde:'Zygarde-Complete',
hoopa:'Hoopa-Unbound',
lycanroc:'Lycanroc-Dusk',
wishiwashi:'Wishiwashi-School',
necrozma:'Necrozma-Ultra',
eternatus:'Eternatus-Eternamax',
palafin:'Palafin-Hero',
ogerpon:'Ogerpon-Wellspring'
};
if(toID(headSpecies.name)in specialSelfFusions){
return dex.species.get(specialSelfFusions[toID(headSpecies.name)]);
}
if(headSpecies.otherFormes){for(var _i32=0,_headSpecies$otherFor2=
headSpecies.otherFormes;_i32<_headSpecies$otherFor2.length;_i32++){var forme=_headSpecies$otherFor2[_i32];
if(forme.endsWith('-Mega')||forme.endsWith('-Mega-Y')||
forme.endsWith('-Primal')||
forme.endsWith('-Origin')||
forme.endsWith('-Therian')||
forme.endsWith('-Starter')||
forme.endsWith('-Crowned'))
return dex.species.get(forme);
}
}
return new Species(bodySpecies.id,bodySpecies.name,Object.assign({},bodySpecies));
}
var pair=[headSpecies.name,bodySpecies.name].sort();
if(pair[0]==='Kyurem'&&pair[1]==='Reshiram')return dex.species.get('Kyurem-White');
if(pair[0]==='Kyurem'&&pair[1]==='Zekrom')return dex.species.get('Kyurem-Black');
if(pair[0]==='Necrozma'&&pair[1]==='Solgaleo')return dex.species.get('Necrozma-Dusk-Mane');
if(pair[0]==='Lunala'&&pair[1]==='Necrozma')return dex.species.get('Necrozma-Dawn-Wings');
if(pair[0]==='Calyrex'&&pair[1]==='Glastrier')return dex.species.get('Calyrex-Ice');
if(pair[0]==='Calyrex'&&pair[1]==='Spectrier')return dex.species.get('Calyrex-Shadow');
if(pair[0]==='Arrokuda'&&pair[1]==='Cramorant')return dex.species.get('Cramorant-Gulping');
if(pair[0]==='Cramorant'&&pair[1]==='Pikachu')return dex.species.get('Cramorant-Gorging');

var fusionSpecies=Object.assign({},bodySpecies);
fusionSpecies.weightkg=Math.max(0.1,(headSpecies.weightkg+bodySpecies.weightkg)/2);

fusionSpecies.abilities={
0:headSpecies.abilities[0],
1:bodySpecies.abilities[1]||bodySpecies.abilities[0],
H:headSpecies.abilities['H'],
S:headSpecies.abilities['S']
};
fusionSpecies.bst=0;
var i;
var newStats=Object.assign({},fusionSpecies.baseStats);
for(i in fusionSpecies.baseStats){
var headStat=void 0,bodyStat=void 0;
if(['hp','spa','spd'].includes(i)){
headStat=headSpecies.baseStats[i]*2;
bodyStat=bodySpecies.baseStats[i];
}else{
headStat=headSpecies.baseStats[i];
bodyStat=bodySpecies.baseStats[i]*2;
}
var stat=Math.floor((headStat+bodyStat)/3);
if(stat<1)stat=1;
if(stat>255)stat=255;
if(i==='hp'&&pokemon.ability==='Wonder Guard')stat=1;
newStats[i]=stat;
fusionSpecies.bst+=stat;
}
fusionSpecies.baseStats=newStats;
var newTypes=[headSpecies.types[0],bodySpecies.types[1]||bodySpecies.types[0]];
if(newTypes[1]===newTypes[0])newTypes=[newTypes[0]];
fusionSpecies.types=newTypes;

return new Species(fusionSpecies.id,fusionSpecies.name,Object.assign({},fusionSpecies));
},
ModifyTierSet:function(tierSet,dex,extra){return tierSet.filter(
function(_ref10){var type=_ref10[0],id=_ref10[1];
if(type==='pokemon'){
var sp=dex.species.get(id);
if(sp.baseSpecies!==sp.name)return false;
}
return true;
}
);},
ModifyLearnset:function(pokemon,dex,learnset){
var name=pokemon.name||'';
var headSpecies=dex.species.get(name);
if(!headSpecies.exists)return learnset;
var fusionSpecies=dex.species.getFromPokemon(pokemon);
var moveDex=dex.getMovedex();
for(var id in moveDex){
if(learnset.includes(id))continue;
if(!dex.canLearn(headSpecies.id,id)&&!dex.canLearn(fusionSpecies.id,id))continue;
learnset.push(id);
}
return learnset;
}
},

natdex:{
movesMod:function(data){
if(data.isNonstandard==='Past')data.isNonstandard=null;
},
speciesMod:function(data,extra){
var gen=9;
if(extra&&extra.gen)gen=extra.gen;
var table=window.BattleTeambuilderTable["gen"+gen+"natdex"];
if(data.id in table.overrideTier)data.tier=table.overrideTier[data.id];
}
},
gen7letsgo:{
movesMod:function(data){
var table=window.BattleTeambuilderTable['gen7letsgo'];
if(data.id in table.overrideMoveData)Object.assign(data,table.overrideMoveData[data.id]);
},
itemsMod:function(data){
var table=window.BattleTeambuilderTable['gen7letsgo'];
if(data.id in table.overrideItemDesc)data.shortDesc=table.overrideItemDesc[data.id];
},
abilitiesMod:function(data){
var table=window.BattleTeambuilderTable['gen7letsgo'];
if(data.id in table.overrideAbilityData)Object.assign(data,table.overrideAbilityData[data.id]);
},
speciesMod:function(data){
var table=window.BattleTeambuilderTable['gen7letsgo'];
if(data.id in table.overrideSpeciesData)Object.assign(data,table.overrideSpeciesData[data.id]);
data.abilities={0:"No Ability"};
if(data.id in table.overrideTier)data.tier=table.overrideTier[data.id];
}
},
gen8bdsp:{
movesMod:function(data){
var table=window.BattleTeambuilderTable['gen8bdsp'];
if(data.id in table.overrideMoveData)Object.assign(data,table.overrideMoveData[data.id]);
},
itemsMod:function(data){
var table=window.BattleTeambuilderTable['gen8bdsp'];
if(data.id in table.overrideItemDesc)data.shortDesc=table.overrideItemDesc[data.id];
},
abilitiesMod:function(data){
var table=window.BattleTeambuilderTable['gen8bdsp'];
if(data.id in table.overrideAbilityData)Object.assign(data,table.overrideAbilityData[data.id]);
},
speciesMod:function(data){
var table=window.BattleTeambuilderTable['gen8bdsp'];
if(data.id in table.overrideSpeciesData)Object.assign(data,table.overrideSpeciesData[data.id]);
if(data.id in table.overrideTier)data.tier=table.overrideTier[data.id];
}
},
gen9morebalancedhackmons:{
movesMod:function(data){
var table=window.BattleTeambuilderTable['gen9morebalancedhackmons'];
if(data.id in table.overrideMoveData)Object.assign(data,table.overrideMoveData[data.id]);
},
itemsMod:function(data){
var table=window.BattleTeambuilderTable['gen9morebalancedhackmons'];
if(data.id in table.overrideItemDesc)data.shortDesc=table.overrideItemDesc[data.id];
},
abilitiesMod:function(data){
var table=window.BattleTeambuilderTable['gen9morebalancedhackmons'];
if(data.id in table.overrideAbilityData)Object.assign(data,table.overrideAbilityData[data.id]);
},
speciesMod:function(data){
var table=window.BattleTeambuilderTable['gen9morebalancedhackmons'];
if(data.id in table.overrideSpeciesData)Object.assign(data,table.overrideSpeciesData[data.id]);
},
ModifyTierSet:function(tierSet,dex,extra){return tierSet;}
},
digimon:{
movesMod:function(data){

if(data.id in window.DigiMovedex){
Object.assign(data,window.DigiMovedex[data.id]);
data.exists=true;
}
},
itemsMod:function(data){

if(data.id in window.DigiItems){
Object.assign(data,window.DigiItems[data.id]);
data.exists=true;
}
},
abilitiesMod:function(data){

if(data.id in window.DigiAbilities){
Object.assign(data,window.DigiAbilities[data.id]);
data.exists=true;
}
},
speciesMod:function(data){

if(data.id in window.Digidex){
Object.assign(data,window.Digidex[data.id]);
data.exists=true;
}
},
typesMod:function(data){


var typeData=window.DigiTypeChart[data.id];
if(typeData&&typeData.damageTaken){
typeData.exists=true;

if(!typeData.id)typeData.id=data.id;
if(!typeData.name)typeData.name=data.name;
if(!typeData.effectType)typeData.effectType='Type';
data=Object.assign({},typeData);
}
},
ModifyLearnset:function(pokemon,dex,learnset){
if(!pokemon.preEvo)return learnset;
var preEvoSpecies=dex.species.get(pokemon.preEvo);
var moveDex=dex.getMovedex();
for(var id in moveDex){
if(learnset.includes(id))continue;
if(!dex.canLearn(preEvoSpecies.id,id))continue;
learnset.push(id);
}
return learnset;
}
}
};

if(typeof require==='function'){

global.Dex=Dex;
global.toID=toID;
}
//# sourceMappingURL=battle-dex.js.map