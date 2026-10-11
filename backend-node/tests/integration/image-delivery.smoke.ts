import assert from 'node:assert/strict';
import sharp from 'sharp';
import { convertImage } from '../../src/modules/files/image-delivery';
async function main() {
 const input = await sharp({create:{width:1200,height:800,channels:4,background:{r:220,g:20,b:30,alpha:.5}}}).png().toBuffer();
 const output = await convertImage(input, 'image/png',360);
 const metadata = await sharp(output.body).metadata();
 assert.equal(output.mime,'image/webp');
 assert.equal(metadata.width,360); assert.equal(metadata.height,240); assert.equal(metadata.hasAlpha,true);
 assert.ok(output.body.length<input.length);
 assert.equal((await convertImage(input,'image/png',360)).etag,output.etag);
 const bad=Buffer.from('invalid');
 assert.deepEqual((await convertImage(bad,'image/png',360)).body,bad);
 const small=await sharp({create:{width:20,height:10,channels:4,background:'red'}}).png().toBuffer();
 assert.ok((await sharp((await convertImage(small,'image/png',1600)).body).metadata()).width!<=20);
 console.log('Image delivery: dimensions, transparency, stable ETags, fallback, no upscaling passed');
}
void main();
