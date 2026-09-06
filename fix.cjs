const fs = require('fs');

let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.replace(/\(Dashboard\)/g, '');
adminHtml = adminHtml.replace(/Portfel \(Work\)/g, 'Portfel');
adminHtml = adminHtml.replace(/Müştərilər \(Clients\)/g, 'Müştərilər');
adminHtml = adminHtml.replace(/Məqalələr \(Ideas\)/g, 'Məqalələr');
adminHtml = adminHtml.replace(/AI Ops Assistant/g, 'AI Köməkçisi');
adminHtml = adminHtml.replace(/İcmal \(Dashboard\)/g, 'İcmal');
adminHtml = adminHtml.replace(/<th>Actions<\/th>/g, '<th>Əməliyyatlar</th>');
adminHtml = adminHtml.replace(/\(New\)/g, '');
adminHtml = adminHtml.replace(/\(Reviewing\)/g, '');
adminHtml = adminHtml.replace(/\(Shortlisted\)/g, '');
adminHtml = adminHtml.replace(/\(Rejected\)/g, '');
adminHtml = adminHtml.replace(/İşə qəbul \(Hired\)/g, 'İşə qəbul');
adminHtml = adminHtml.replace(/\(Hired\)/g, '');
adminHtml = adminHtml.replace(/\(General\)/g, '');
adminHtml = adminHtml.replace(/\(Home\)/g, '');
adminHtml = adminHtml.replace(/\(Contact\)/g, '');
adminHtml = adminHtml.replace(/\(Offices\)/g, '');
adminHtml = adminHtml.replace(/\(Clients\)/g, '');
adminHtml = adminHtml.replace(/\(Work\)/g, '');
adminHtml = adminHtml.replace(/\(Ideas\)/g, '');
adminHtml = adminHtml.replace(/CMS Rebuild 2\.0 ⚙️/g, 'CMS 2.0 ⚙️');
fs.writeFileSync('admin.html', adminHtml, 'utf8');

let adminJs = fs.readFileSync('js/admin.js', 'utf8');
adminJs = adminJs.replace(/\(Dashboard\)/g, '');
adminJs = adminJs.replace(/\(Portfolio\)/g, '');
adminJs = adminJs.replace(/\(Clients\)/g, '');
adminJs = adminJs.replace(/Müştərilər \(Clients\)/g, 'Müştərilər');
adminJs = adminJs.replace(/\(Vakansiyalar\)/g, '');
adminJs = adminJs.replace(/\(Audit Logs\)/g, '');
adminJs = adminJs.replace(/İcmal \(Dashboard\)/g, 'İcmal');

// Add spinners to standard grids
adminJs = adminJs.replace(/(const grid = document.getElementById\('[^']+'\);\s*if \(!grid\) return;)(\s*const res = await fetch)/g, '$1\n      grid.innerHTML = \'<div class="spinner" style="margin:3rem auto; display:block;"></div>\';$2');

// Add spinner to tables
adminJs = adminJs.replace(/(const container = document.getElementById\('[^']+'\);\s*if \(!container\) return;)(\s*const res = await fetch)/g, '$1\n      container.innerHTML = \'<tr><td colspan="10" style="text-align:center; padding:3rem;"><div class="spinner"></div></td></tr>\';$2');

// Fix inboxList
adminJs = adminJs.replace(/const container = document.getElementById\('inboxList'\);\s*if \(!container\) return;/g, 'const container = document.getElementById(\'inboxList\');\n      if (!container) return;\n      container.innerHTML = \'<div class="spinner" style="margin:2rem auto; display:block;"></div>\';');

// Fix applicationsList
adminJs = adminJs.replace(/const container = document.getElementById\('applicationsList'\);\s*if \(!container\) return;\s*container\.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:3rem;"><div class="spinner"><\/div><\/td><\/tr>';/g, 'const container = document.getElementById(\'applicationsList\');\n      if (!container) return;\n      container.innerHTML = \'<tr><td colspan="6" style="text-align:center; padding:3rem;"><div class="spinner" style="margin:0 auto; display:block;"></div></td></tr>\';');

// Fix auditLogsList
adminJs = adminJs.replace(/'<tr><td colspan="10" style="text-align:center; padding:3rem;"><div class="spinner"><\/div><\/td><\/tr>'/g, '\'<div class="spinner" style="margin:3rem auto; display:block;"></div>\'');

fs.writeFileSync('js/admin.js', adminJs, 'utf8');

let adminCss = fs.readFileSync('css/admin.css', 'utf8');
adminCss = adminCss.replace(/'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif/g, "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif");
if (!adminCss.includes('scroll-behavior: smooth;')) {
    adminCss += '\nhtml { scroll-behavior: smooth; }\n';
}
fs.writeFileSync('css/admin.css', adminCss, 'utf8');

console.log('Fix applied successfully!');
