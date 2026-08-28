const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.message);
    process.exitCode = 1;
  }
}

test("prototype contains the PRD MVP screen landmarks", () => {
  const html = read("index.html");
  [
    "view-home",
    "view-camera",
    "view-crop",
    "view-enhance",
    "view-pages",
    "view-export",
    "view-settings",
    "sheet-rename",
    "sheet-delete-document",
    "sheet-delete-page",
    "sheet-pdf-conflict",
    "sheet-temp-recovery"
  ].forEach((id) => {
    assert(html.includes(`id="${id}"`), `Missing #${id}`);
  });
});

test("prototype copy reflects local-first privacy and sandbox storage constraints", () => {
  const html = read("index.html");
  [
    "本地保存",
    "卸载 App 后",
    "不包含文档内容",
    "App 沙盒",
    "10mm 白边",
    "覆盖",
    "另存一份"
  ].forEach((text) => {
    assert(html.includes(text), `Missing copy: ${text}`);
  });
});

test("interaction model exposes required document workflow actions", () => {
  const appSource = read("app.js");
  const sandbox = {
    window: {},
    document: {
      addEventListener() {},
      querySelectorAll() {
        return [];
      },
      getElementById() {
        return null;
      }
    },
    console
  };
  vm.runInNewContext(appSource, sandbox);
  const model = sandbox.window.ScanUxModel;

  assert(model, "ScanUxModel is not exported");
  [
    "addPage",
    "deletePage",
    "movePage",
    "renameDocument",
    "resolvePdfConflict",
    "setEnhanceMode",
    "restoreTempPhoto"
  ].forEach((method) => {
    assert(typeof model[method] === "function", `Missing model method: ${method}`);
  });

  const state = model.createState();
  model.addPage(state, "增强");
  model.addPage(state, "黑白");
  model.movePage(state, 1, 0);
  model.renameDocument(state, "报销单 0827");
  model.resolvePdfConflict(state, "copy");

  assert(state.currentDocument.pages.length === 2, "Expected two pages");
  assert(state.currentDocument.pages[0].mode === "黑白", "Expected reordered page first");
  assert(state.currentDocument.title === "报销单 0827", "Expected renamed document");
  assert(state.export.conflictResolution === "copy", "Expected PDF copy conflict resolution");
});

test("every declared UI action is handled by the prototype script", () => {
  const html = read("index.html");
  const appSource = read("app.js");
  const actions = Array.from(html.matchAll(/data-action="([^"]+)"/g)).map((match) => match[1]);
  const uniqueActions = [...new Set(actions)];

  uniqueActions.forEach((action) => {
    assert(appSource.includes(`"${action}"`) || appSource.includes(`'${action}'`), `Unhandled action: ${action}`);
  });
});
