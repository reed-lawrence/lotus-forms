const { existsSync, rmSync, mkdirSync, readdirSync, cpSync, fstatSync, readFileSync, writeFileSync } = require('fs');

const patterns = [
  /.*\.js$/, // ending in .js,
  /.*\.ts$/, // ending in .ts,
  /.*\.map$/, // ending in .map,
  /dist/ // dist folder
];

const paths = __dirname.split('/').filter(str => !!str);

const root = paths.reduce((str, path, i) => {
  if (i < paths.length - 2)
    return `${str}/${path}`;
  else
    return str;
}, '');

const package_dir = `${root}/_package`;
const out_dir = `${root}/build/out`;

if (!existsSync(`${root}/package.json`))
  throw new Error('No package.json found');

if (existsSync(package_dir))
  rmSync(package_dir, { recursive: true, force: true });

mkdirSync(package_dir);

readdirSync(out_dir).forEach(name => {
  for (const pattern of patterns) {
    if (pattern.test(name)) {
      cpSync(`${out_dir}/${name}`, `${package_dir}/${name}`, { recursive: true });
      return;
    }
  }
});

const package_json = JSON.parse(readFileSync(`${root}/package.json`, { encoding: 'utf-8' }).toString());
delete package_json.scripts;

writeFileSync(`${package_dir}/package.json`, JSON.stringify(package_json));


