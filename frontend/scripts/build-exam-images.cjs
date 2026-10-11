// Run after changing bundled artwork: node frontend/scripts/build-exam-images.cjs
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('../../backend-node/node_modules/sharp');
const root = path.resolve(__dirname, '../public/exam-assets');
async function walk(dir) {
 const entries = await fs.readdir(dir, {withFileTypes:true});
 return (await Promise.all(entries.filter(e => e.name !== 'optimized').map(e => e.isDirectory() ? walk(path.join(dir,e.name)) : path.join(dir,e.name)))).flat();
}
(async () => {
 const output = path.join(root,'optimized');
 await fs.mkdir(output,{recursive:true});
 const manifest = {};
 let originalBytes=0, largestBytes=0;
 for (const file of (await walk(root)).filter(f => /\.(png|jpe?g)$/i.test(f)).sort()) {
  const bytes=await fs.readFile(file);
  const meta=await sharp(bytes).metadata();
  const hash=crypto.createHash('sha256').update(bytes).update('webp-v1-q85').digest('hex').slice(0,16);
  const widths=[160,360,720,1200,1600].filter(w=>w<meta.width);
  widths.push(Math.min(meta.width,1600));
  const variants=[];
  for (const width of [...new Set(widths)]) {
   const name=`${hash}-${width}.webp`;
   const data=await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality:85,alphaQuality:100,effort:5}).toBuffer();
   await fs.writeFile(path.join(output,name),data);
   variants.push({width,url:`/exam-assets/optimized/${name}`,bytes:data.length});
  }
  manifest['/exam-assets/'+path.relative(root,file).split(path.sep).join('/')]={width:meta.width,height:meta.height,variants};
  originalBytes+=bytes.length; largestBytes+=variants.at(-1).bytes;
 }
 await fs.writeFile(path.resolve(__dirname,'../lib/exam-image-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const bg=manifest['/exam-assets/creator/green-studio-backdrop-red.png'];
 const select=w=>bg.variants.find(v=>v.width>=w)||bg.variants.at(-1);
 await fs.writeFile(path.resolve(__dirname,'../app/exam-images.css'),`:root { --exam-studio-image: url("${select(720).url}"); }\n@media (min-width: 701px), (min-resolution: 2dppx) { :root { --exam-studio-image: url("${select(1600).url}"); } }\n`);
 console.log(JSON.stringify({images:Object.keys(manifest).length,originalBytes,largestBytes,reduction:Math.round((1-largestBytes/originalBytes)*100)+'%'}));
})();
