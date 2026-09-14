// Descriptive records based on the supplied photographs and existing collection copy.
// Provenance, dimensions, and material certification have not been supplied.
const records = [
  ['000','Steep Paper Weight','Polished steel. A study in repetition.','-1.png','Cubic','Polished steel','Brushed exterior / mirrored interior','Nested cubic openings','The frame repeats itself inside the reflection. A solid edge becomes the beginning of an apparent interior.'],

  ['001','Infinite reflection','Polished steel. A study in repetition.','0.png','Cubic','Polished steel','Brushed exterior / mirrored interior','Nested cubic openings','The frame repeats itself inside the reflection. A solid edge becomes the beginning of an apparent interior.'],
  ['002','Intersect','Weathered planes meet mirrored steel.','1.png','Angular','Steel / weathered metal','Mirror polish / mottled brown surface','A cube crossed by an inclined plane','The inclined plane interrupts the stillness of the cube. In the mirrored face, that interruption becomes a second object.'],
  ['003','Golden ratio','Brushed brass, reflected inward.','2.png','Cubic','Brass','Directional brushing / mirrored recesses','A cubic frame around repeated voids','Light collects inside the recesses while the outer planes remain quiet. The distinction between mass and opening is held by a thin edge.'],
  ['004','Equilibrium','A quiet balance of mass and space.','3.png','Angular','Metal — specification unrecorded','Brushed inner planes / polished outer edges','A tilted open frame balanced on a low support','The eye searches for the point at which weight becomes still. Space is as active here as the material that defines it.'],
  ['005','Cadence','A rhythm of light and silver.','4.png','Angular','Metal — specification unrecorded','Silver-toned reflective surface','Vertical supports meeting an inclined crown','Repetition gives the surface a rhythm. Small changes in reflection keep each interval distinct.'],
  ['006','Ascend','Stepped gold forms on stitched leather.','ascend.png','Stepped','Gold-toned metal / leather','Vertical brushing / stitched leather','Graduated rectangular columns on a shared plinth','Each column catches a different measure of light. The stepped silhouette rises from a single, carefully bounded foundation.'],
];
export const objects = records.map(([id,title,description,file,form,material,surface,composition,curatorNote]) => ({
  id,title,description,image:`/products/${file}`,imageWidth:id==='001'?1473:id==='003'?1024:2048,imageHeight:id==='001'?1134:id==='003'?1024:2048,category:'Sculptural Collection',form,material,surface,composition,curatorNote,
  materials:({ '001':['Steel'], '002':['Steel','Metal'], '003':['Brass'], '004':['Metal'], '005':['Metal'], '006':['Metal','Leather'] })[id], status:'Archived', provenance:'Maker, date and provenance unrecorded', dimensions:null,
  archiveHistory:['Image documented','Surface observed','Form described','Digital record archived'],
  structure:({
 '000':[{label:'Outer frame',position:18},{label:'Reflected interior',position:48},{label:'Dark plinth',position:80}],

 '001':[{label:'Outer frame',position:18},{label:'Reflected interior',position:48},{label:'Dark plinth',position:80}],
 '002':[{label:'Mirrored cube',position:25},{label:'Inclined plane',position:52},{label:'Weathered plinth',position:82}],
 '003':[{label:'Cubic frame',position:24},{label:'Mirrored recesses',position:50},{label:'Low plinth',position:82}],
 '004':[{label:'Tilted frame',position:28},{label:'Open centre',position:52},{label:'Low support',position:82}],
 '005':[{label:'Inclined crown',position:18},{label:'Vertical supports',position:52},{label:'Shared plinth',position:82}],
 '006':[{label:'Stepped columns',position:24},{label:'Metal plinth',position:80},{label:'Stitched pad',position:91}],
 })[id],
}));
export function archiveCounts(items = objects) {
  return {Objects:items.length,Materials:new Set(items.flatMap(o=>o.materials)).size,Forms:new Set(items.map(o=>o.form)).size,Collections:new Set(items.map(o=>o.category)).size};
}
export function chooseObject(currentId, random = Math.random) {
  const candidates = objects.filter(object=>object.id!==currentId);
  return candidates[Math.min(candidates.length-1, Math.floor(Math.max(0,random())*candidates.length))];
}
export function readStudied(value) {
  try {const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.filter(id=>objects.some(o=>o.id===id)):[];} catch {return [];}
}
export const lightStudies = {
  morning:{label:'Morning',note:'Soft natural surround',background:'#e9e5dc'},
  noon:{label:'Noon',note:'A clean, bright surround',background:'#faf9f5'},
  dusk:{label:'Dusk',note:'Warm, low-light surround',background:'#b8a18b'},
  gallery:{label:'Gallery',note:'A quiet charcoal surround',background:'#33332f'},
};
