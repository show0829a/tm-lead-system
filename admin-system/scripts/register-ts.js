const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const Module = require('module');

// Alias resolver for '@/...' -> '<admin-system>/src/...'
const origResolve = Module._resolveFilename;
const srcDir = path.resolve(__dirname, '../src');

Module._resolveFilename = function(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    request = path.join(srcDir, request.slice(2));
  }
  return origResolve.call(this, request, parent, isMain, options);
};

require.extensions['.ts'] = function(module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      skipLibCheck: true
    }
  }).outputText;
  return module._compile(compiled, filename);
};
