import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { objects, archiveCounts, chooseObject, readStudied } from '../lib/objects.mjs';

test('archive records have unique identities and real supplied images',()=>{
 assert.equal(new Set(objects.map(o=>o.id)).size,objects.length);
 for(const object of objects){assert.ok(existsSync(`public${object.image}`));for(const key of ['form','material','surface','composition','curatorNote'])assert.ok(object[key]);}
 assert.equal(objects.find(o=>o.id==='006').image,'/products/ascend.png');
});
test('archive index reflects records instead of display constants',()=>{
 assert.deepEqual(archiveCounts([]),{Objects:0,Materials:0,Forms:0,Collections:0});
 const repeated=[objects[0],{...objects[0],id:'test'}];
 assert.deepEqual(archiveCounts(repeated),{Objects:2,Materials:objects[0].materials.length,Forms:1,Collections:1});
});
test('discovery always selects an existing object and avoids the previous selection',()=>{
 for(const object of objects)for(const fraction of [0,.2,.5,.99,1]){const result=chooseObject(object.id,()=>fraction);assert.ok(objects.includes(result));assert.notEqual(result.id,object.id);}
});
test('object memory tolerates damaged or obsolete stored data',()=>{
 for(const input of [null,'bad','{}','"001"'])assert.deepEqual(readStudied(input),[]);
 assert.deepEqual(readStudied('["001","bogus",6,"006"]'),['001','006']);
});
