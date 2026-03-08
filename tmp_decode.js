const colors = [4289225241, 4291259443, 4287072135, 4288845861, 4286877948, 4285518447];
for (let c of colors) {
    let a = (c >>> 24) & 255;
    let r = (c >>> 16) & 255;
    let g = (c >>> 8) & 255;
    let b = c & 255;
    console.log(`Color ${c}: rgba(${r}, ${g}, ${b}, ${a/255})`);
}
