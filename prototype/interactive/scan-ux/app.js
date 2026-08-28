(function () {
  const existingPdfNames = new Set(["扫描文档 20260827-1430.pdf"]);
  const defaultTitle = "扫描文档 20260827-1430";

  function createPage(index, mode) {
    return {
      id: `page_${String(index).padStart(3, "0")}`,
      order: index,
      mode,
      rotation: 0,
      orientation: index % 3 === 0 ? "landscape" : "portrait"
    };
  }

  const ScanUxModel = {
    createState() {
      return {
        currentView: "home",
        activeSheet: null,
        pendingDeletePageId: null,
        enhanceMode: "增强",
        flashOn: false,
        tempPhotoAvailable: true,
        currentDocument: {
          id: "doc_001",
          title: defaultTitle,
          createdAt: "今天 14:30",
          updatedAt: "刚刚更新",
          status: "draft",
          pages: []
        },
        export: {
          fileName: `${defaultTitle}.pdf`,
          conflictResolution: null,
          completed: false,
          fileSize: "2.4 MB"
        }
      };
    },
    addPage(state, mode) {
      const nextIndex = state.currentDocument.pages.length + 1;
      const page = createPage(nextIndex, mode || state.enhanceMode);
      state.currentDocument.pages.push(page);
      state.currentDocument.updatedAt = "刚刚更新";
      state.currentDocument.status = "draft";
      return page;
    },
    deletePage(state, pageId) {
      state.currentDocument.pages = state.currentDocument.pages
        .filter((page) => page.id !== pageId)
        .map((page, index) => ({ ...page, order: index + 1 }));
      state.currentDocument.updatedAt = "刚刚更新";
    },
    movePage(state, fromIndex, toIndex) {
      const pages = state.currentDocument.pages;
      if (fromIndex < 0 || fromIndex >= pages.length || toIndex < 0 || toIndex >= pages.length) {
        return;
      }
      const [page] = pages.splice(fromIndex, 1);
      pages.splice(toIndex, 0, page);
      pages.forEach((item, index) => {
        item.order = index + 1;
      });
      state.currentDocument.updatedAt = "刚刚更新";
    },
    renameDocument(state, title) {
      const cleanTitle = String(title || "").trim();
      if (!cleanTitle) {
        return false;
      }
      state.currentDocument.title = cleanTitle;
      state.export.fileName = cleanTitle.endsWith(".pdf") ? cleanTitle : `${cleanTitle}.pdf`;
      state.currentDocument.updatedAt = "刚刚更新";
      return true;
    },
    resolvePdfConflict(state, resolution) {
      state.export.conflictResolution = resolution;
      if (resolution === "copy") {
        state.export.fileName = state.export.fileName.replace(/(?: \(\d+\))?\.pdf$/, " (1).pdf");
      }
    },
    setEnhanceMode(state, mode) {
      state.enhanceMode = mode;
    },
    restoreTempPhoto(state, shouldRestore) {
      state.tempPhotoAvailable = false;
      state.currentView = shouldRestore ? "crop" : "camera";
    }
  };

  window.ScanUxModel = ScanUxModel;

  if (
    typeof document === "undefined" ||
    !document.addEventListener ||
    !document.getElementById ||
    !document.getElementById("view-home")
  ) {
    return;
  }

  const state = ScanUxModel.createState();
  const views = Array.from(document.querySelectorAll(".app-view"));
  const sheets = Array.from(document.querySelectorAll(".sheet"));
  const scrim = document.getElementById("scrim");
  const toast = document.getElementById("toast");
  const pageGrid = document.getElementById("page-grid");
  const documentList = document.getElementById("document-list");
  const emptyState = document.getElementById("empty-state");
  const processedPreview = document.getElementById("processed-preview");
  const pdfName = document.getElementById("pdf-name");
  const exportSuccess = document.getElementById("export-success");
  const exportButton = document.getElementById("export-button");
  const scanStatus = document.getElementById("scan-status");

  function showView(name) {
    state.currentView = name;
    views.forEach((view) => {
      view.classList.toggle("active", view.dataset.view === name);
    });
    render();
  }

  function showSheet(id) {
    state.activeSheet = id;
    sheets.forEach((sheet) => sheet.classList.toggle("open", sheet.id === id));
    scrim.classList.add("open");
  }

  function closeSheet() {
    state.activeSheet = null;
    sheets.forEach((sheet) => sheet.classList.remove("open"));
    scrim.classList.remove("open");
  }

  let toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function renderDocumentList() {
    const hasPages = state.currentDocument.pages.length > 0;
    emptyState.classList.toggle("hidden", hasPages);
    documentList.innerHTML = "";

    if (!hasPages) {
      return;
    }

    const card = document.createElement("button");
    card.type = "button";
    card.className = "document-card";
    card.dataset.action = "show-pages";
    card.innerHTML = `
      <span class="thumb" aria-hidden="true"><span class="mini-paper"></span></span>
      <span>
        <h2>${state.currentDocument.title}</h2>
        <p>${state.currentDocument.pages.length} 页 · ${state.currentDocument.updatedAt}</p>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    `;
    documentList.appendChild(card);
  }

  function pageButton(page, index, direction, label, path) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tiny-button";
    button.dataset.action = direction;
    button.dataset.index = String(index);
    button.setAttribute("aria-label", label);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
    return button;
  }

  function renderPages() {
    const pages = state.currentDocument.pages;
    document.getElementById("current-doc-title").textContent = state.currentDocument.title;
    document.getElementById("page-count").textContent = String(pages.length);
    document.getElementById("export-page-count").textContent = `${pages.length} 页`;
    document.getElementById("document-updated").textContent = state.currentDocument.updatedAt;
    pageGrid.innerHTML = "";

    pages.forEach((page, index) => {
      const item = document.createElement("article");
      item.className = "page-item";
      item.innerHTML = `
        <button class="page-thumb" type="button" data-action="edit-page" data-page-id="${page.id}" aria-label="重新编辑第 ${index + 1} 页">
          <span class="mini-paper mode-${page.mode}"></span>
        </button>
        <div class="page-meta">
          <span>${index + 1}</span>
          <span>${page.mode}</span>
        </div>
      `;

      const actions = document.createElement("div");
      actions.className = "page-actions";
      actions.appendChild(pageButton(page, index, "move-page-up", "上移", '<path d="m18 15-6-6-6 6"/>'));
      actions.appendChild(pageButton(page, index, "move-page-down", "下移", '<path d="m6 9 6 6 6-6"/>'));
      actions.appendChild(pageButton(page, index, "open-delete-page", "删除页面", '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>'));
      item.querySelector(".page-meta").appendChild(actions);
      pageGrid.appendChild(item);
    });
  }

  function renderEnhance() {
    document.querySelectorAll(".segment").forEach((segment) => {
      segment.classList.toggle("active", segment.dataset.mode === state.enhanceMode);
    });
    processedPreview.className = `scan-paper processed mode-${state.enhanceMode}`;
  }

  function renderExport() {
    pdfName.value = state.export.fileName;
    exportSuccess.classList.toggle("hidden", !state.export.completed);
    exportButton.disabled = state.currentDocument.pages.length === 0;
  }

  function render() {
    renderDocumentList();
    renderPages();
    renderEnhance();
    renderExport();
  }

  function simulateImport() {
    showToast("已选择 3 张图片，将按顺序逐页确认");
    showView("crop");
  }

  function exportPdf() {
    const name = pdfName.value.trim();
    if (!name) {
      showToast("PDF 文件名不能为空");
      return;
    }
    state.export.fileName = name.endsWith(".pdf") ? name : `${name}.pdf`;
    if (existingPdfNames.has(state.export.fileName) && !state.export.conflictResolution) {
      showSheet("sheet-pdf-conflict");
      return;
    }
    state.export.completed = true;
    state.currentDocument.status = "exported";
    state.currentDocument.updatedAt = "刚刚更新";
    existingPdfNames.add(state.export.fileName);
    showToast("PDF 已保存到 App 沙盒");
    render();
  }

  function handleAction(action, target) {
    if (!action) {
      return;
    }

    if (action === "start-scan") {
      if (state.tempPhotoAvailable) {
        showSheet("sheet-temp-recovery");
      } else {
        showView("camera");
      }
      return;
    }

    const actions = {
      "go-home": () => showView("home"),
      "show-settings": () => showView("settings"),
      "show-camera": () => showView("camera"),
      "show-crop": () => showView("crop"),
      "show-pages": () => showView("pages"),
      "show-export": () => showView("export"),
      "capture": () => {
        scanStatus.textContent = "正在处理照片...";
        setTimeout(() => {
          scanStatus.textContent = "已检测到文档边缘";
          showView("crop");
        }, 420);
      },
      "permission-denied": () => showView("permission"),
      "import-gallery": simulateImport,
      "redetect": () => showToast("已重新检测边缘，可继续手动调整"),
      "confirm-crop": () => showView("enhance"),
      "rotate-page": () => {
        processedPreview.style.transform = processedPreview.style.transform ? "" : "rotate(90deg) scale(0.72)";
        showToast("已旋转，导出时将自动匹配 A4 方向");
      },
      "set-mode": () => {
        ScanUxModel.setEnhanceMode(state, target.dataset.mode);
        showToast(`${target.dataset.mode}模式已应用`);
        render();
      },
      "add-page": () => {
        ScanUxModel.addPage(state, state.enhanceMode);
        showToast("页面已加入文档");
        showView("pages");
      },
      "edit-page": () => {
        const page = state.currentDocument.pages.find((item) => item.id === target.dataset.pageId);
        if (page) {
          ScanUxModel.setEnhanceMode(state, page.mode);
        }
        showView("enhance");
      },
      "open-rename": () => {
        document.getElementById("rename-input").value = state.currentDocument.title;
        showSheet("sheet-rename");
      },
      "confirm-rename": () => {
        if (ScanUxModel.renameDocument(state, document.getElementById("rename-input").value)) {
          closeSheet();
          showToast("文档已重命名");
          render();
        } else {
          showToast("文档名称不能为空");
        }
      },
      "open-delete-document": () => showSheet("sheet-delete-document"),
      "confirm-delete-document": () => {
        state.currentDocument.pages = [];
        state.currentDocument.title = defaultTitle;
        state.export.completed = false;
        closeSheet();
        showToast("文档和本地资源已清理");
        showView("home");
      },
      "open-delete-page": () => {
        state.pendingDeletePageId = state.currentDocument.pages[Number(target.dataset.index)]?.id || null;
        showSheet("sheet-delete-page");
      },
      "confirm-delete-page": () => {
        if (state.pendingDeletePageId) {
          ScanUxModel.deletePage(state, state.pendingDeletePageId);
        }
        closeSheet();
        showToast("页面已删除");
        render();
      },
      "move-page-up": () => {
        const index = Number(target.dataset.index);
        ScanUxModel.movePage(state, index, index - 1);
        render();
      },
      "move-page-down": () => {
        const index = Number(target.dataset.index);
        ScanUxModel.movePage(state, index, index + 1);
        render();
      },
      "export-pdf": exportPdf,
      "pdf-copy": () => {
        ScanUxModel.resolvePdfConflict(state, "copy");
        closeSheet();
        exportPdf();
      },
      "pdf-overwrite": () => {
        ScanUxModel.resolvePdfConflict(state, "overwrite");
        closeSheet();
        exportPdf();
      },
      "open-preview": () => showToast("已打开系统 PDF 预览"),
      "share-pdf": () => showToast("已调用 Android 系统分享面板"),
      "export-logs": () => showToast("本地日志已导出，不包含文档内容"),
      "toggle-flash": () => {
        state.flashOn = !state.flashOn;
        showToast(state.flashOn ? "闪光灯已开启" : "闪光灯已关闭");
      },
      "restore-temp": () => {
        ScanUxModel.restoreTempPhoto(state, true);
        closeSheet();
        showToast("已恢复未确认照片");
        showView("crop");
      },
      "discard-temp": () => {
        ScanUxModel.restoreTempPhoto(state, false);
        closeSheet();
        showToast("临时照片已清理");
        showView("camera");
      },
      "close-sheet": closeSheet
    };

    if (actions[action]) {
      actions[action]();
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) {
      return;
    }
    handleAction(target.dataset.action, target);
  });

  pdfName.addEventListener("input", () => {
    state.export.fileName = pdfName.value;
    state.export.completed = false;
    renderExport();
  });

  function updateCropPolygon() {
    const canvas = document.getElementById("crop-canvas");
    const rect = canvas.getBoundingClientRect();
    const points = ["tl", "tr", "br", "bl"].map((corner) => {
      const handle = document.querySelector(`[data-corner="${corner}"]`);
      const x = (parseFloat(handle.style.left) / 100) * 320;
      const y = (parseFloat(handle.style.top) / 100) * 430;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    document.getElementById("crop-polygon").setAttribute("points", points.join(" "));
    return rect;
  }

  document.querySelectorAll(".crop-handle").forEach((handle) => {
    let activePointer = null;
    handle.addEventListener("pointerdown", (event) => {
      activePointer = event.pointerId;
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
      if (activePointer !== event.pointerId) {
        return;
      }
      const rect = updateCropPolygon();
      const x = Math.min(91, Math.max(9, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(91, Math.max(8, ((event.clientY - rect.top) / rect.height) * 100));
      handle.style.left = `${x}%`;
      handle.style.top = `${y}%`;
      updateCropPolygon();
    });
    handle.addEventListener("pointerup", () => {
      activePointer = null;
      showToast("边缘已调整");
    });
  });

  updateCropPolygon();
  render();
})();
