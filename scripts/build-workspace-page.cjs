const fs=require('node:fs');
const page=fs.readFileSync('index.html','utf8')
 .replace('</head>','<meta name="dwp-local-preview" content="true"></head>')
 .replace('</body>','<script src="/workspace-entry.js"></script>\n</body>');
fs.writeFileSync('api/workspace-page.cjs','module.exports = '+JSON.stringify(page)+';\n');
