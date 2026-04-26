const fs = require('fs');
const cssPath = 'public/style.css';
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(/background-image:\s*url\('([^']+)'\),\s*(linear-gradient\([^)]+\));\s*background-position:\s*[^;]+;\s*background-size:\s*[^;]+;\s*background-repeat:\s*[^;]+;\s*background-attachment:\s*[^;]+;/g, (match, url, grad) => {
  return `background-image: 
    url('${url}'), 
    url('${url}'), 
    url('${url}'), 
    url('${url}'), 
    ${grad};
  background-position: 
    top 3% left 5%, 
    top 15% right 3%, 
    top 40% left 2%, 
    top 75% right 4%, 
    center;
  background-size: 
    45px auto, 
    35px auto, 
    55px auto, 
    40px auto, 
    cover;
  background-repeat: no-repeat, no-repeat, no-repeat, no-repeat, no-repeat;
  background-attachment: scroll, scroll, scroll, scroll, fixed;`;
});

fs.writeFileSync(cssPath, css);
console.log('Themes updated successfully.');
