const fs = require("fs");
const path = require("path");

const baseUrl = "https://jeonhyeonmin.github.io/blog/?post=";
const blogDir = path.join(__dirname, "blog/blog");
const files = fs.readdirSync(blogDir).filter(f => f.endsWith(".md"));

const urls = files.map(file => {
  return `   <url>\n      <loc>${baseUrl}blog/${encodeURIComponent(file)}</loc>\n   </url>`;
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n   <url>\n      <loc>https://jeonhyeonmin.github.io/blog/</loc>\n   </url>\n${urls.join("\n")}\n</urlset>`;

fs.writeFileSync(path.join(__dirname, "blog/sitemap.xml"), sitemap, "utf8");

console.log("✅ sitemap.xml 생성 완료!");
