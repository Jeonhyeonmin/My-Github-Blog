// ======================================================
// Utils
// ======================================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString();
}

function createElement(tag, classNames = [], textContent = "") {
  const el = document.createElement(tag);
  if (classNames.length) el.classList.add(...classNames);
  if (textContent) el.textContent = textContent;
  return el;
}

function updateURL(params = {}) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  });
  window.history.replaceState({}, "", url);
}

// ======================================================
// Search
// ======================================================
async function search(keyword = "", kind = null) {
  keyword = keyword.toLowerCase().trim();

  if (blogList.length === 0 && !isInitData) {
    await initDataBlogList();
  }

  let results = blogList;

  if (keyword) {
    results = blogList.filter((post) => {
      const postInfo = extractFileInfo(post.name);
      if (!postInfo) return false;

      if (kind === "category") return postInfo.category.toLowerCase() === keyword;
      return post.name.toLowerCase().includes(keyword);
    });
  }

  renderBlogList(results);
}

// ======================================================
// Blog Card Creation
// ======================================================
function createCardElement(fileInfo, index) {
  const card = createElement("div", index === 0 ? bloglistFirstCardStyle.split(" ") : bloglistCardStyle.split(" "));

  if (fileInfo.thumbnail) {
    const img = createElement("img", index === 0 ? bloglistFirstCardImgStyle.split(" ") : bloglistCardImgStyle.split(" "));
    img.src = fileInfo.thumbnail;
    img.alt = fileInfo.title;
    card.appendChild(img);
  }

  const cardBody = createElement("div", bloglistCardBodyStyle.split(" "));

  // Category
  const category = createElement("span", bloglistCardCategoryStyle.split(" "), fileInfo.category);
  category.onclick = (e) => {
    e.stopPropagation();
    search(fileInfo.category, "category");
  };
  cardBody.appendChild(category);

  // Title
  cardBody.appendChild(createElement("h2", bloglistCardTitleStyle.split(" "), fileInfo.title));

  // Description
  const descClass = index === 0 ? bloglistFirstCardDescriptionStyle.split(" ") : bloglistCardDescriptionStyle.split(" ");
  cardBody.appendChild(createElement("p", descClass, fileInfo.description));

  // Author
  const authorDiv = createElement("div", bloglistCardAuthorDivStyle.split(" "));
  const authorImg = createElement("img", bloglistCardAuthorImgStyle.split(" "));
  authorImg.src = users[fileInfo.author].img;
  authorImg.alt = users[fileInfo.author].username;
  const authorName = createElement("p", bloglistCardAuthorStyle.split(" "), users[fileInfo.author].username);
  authorDiv.append(authorImg, authorName);
  cardBody.appendChild(authorDiv);

  // Date
  cardBody.appendChild(createElement("p", bloglistCardDateStyle.split(" "), formatDate(fileInfo.date)));

  card.appendChild(cardBody);

  // Card click -> Render Post
  card.onclick = () => renderPost(fileInfo);

  return card;
}

// ======================================================
// Render Blog List
// ======================================================
function renderBlogList(posts = null, currentPage = 1) {
  const list = posts || blogList;
  const pageUnit = 10;
  const startIndex = (currentPage - 1) * pageUnit;
  const endIndex = currentPage * pageUnit;

  const blogContainer = $("#blog-posts");
  blogContainer.innerHTML = "";
  blogContainer.style.display = "grid";
  $("#contents").style.display = "none";

  const totalPage = Math.ceil(list.length / pageUnit);
  initPagination(totalPage);
  renderPagination(totalPage, currentPage, list);

  list.slice(startIndex, endIndex).forEach((post, index) => {
    const fileInfo = extractFileInfo(post.name);
    if (!fileInfo) return;
    const card = createCardElement(fileInfo, index);
    blogContainer.appendChild(card);
  });
}

// ======================================================
// Render Post
// ======================================================
async function renderPost(fileInfo) {
  const postContainer = $("#contents");
  const blogContainer = $("#blog-posts");
  const pagination = $("#pagination");

  postContainer.style.display = "block";
  blogContainer.style.display = "none";
  pagination.style.display = "none";

  let postDownloadUrl = fileInfo.download_url || `blog/${fileInfo.name}`;
  if (!isLocal && localDataUsing) {
    postDownloadUrl = `${window.location.origin}/${siteConfig.repositoryName}${postDownloadUrl}`;
  }

  try {
    const response = await fetch(postDownloadUrl);
    const text = await response.text();
    fileInfo.fileType === "md"
      ? styleMarkdown("post", text, fileInfo)
      : styleJupyter("post", text, fileInfo);

    updateURL({ post: fileInfo.name });
  } catch {
    styleMarkdown("post", "# Error입니다. 파일명을 확인해주세요.");
  }
}

// ======================================================
// Render Menu
// ======================================================
async function renderMenu() {
  const menuContainer = $("#menu");
  blogMenu.forEach((menu) => {
    const link = createElement("a", [...menuListStyle.split(" "), menu.name], menu.name.split(".")[0]);
    link.href = menu.download_url;
    link.onclick = async (e) => {
      e.preventDefault();
      if (menu.name === "blog.md") {
        await initDataBlogList();
        renderBlogList();
        renderBlogCategory();
        updateURL({ menu: menu.name });
      } else {
        renderOtherContents(menu);
      }
    };
    menuContainer.appendChild(link);
  });

  // Search input
  const searchBtn = $("#search-button");
  const searchCont = $(".search-cont");
  const searchInput = $("#search-input");
  const resetInputButton = $(".reset-inp-btn");

  searchBtn.onclick = () => {
    searchCont.classList.toggle("hidden");
    searchBtn.classList.toggle("active");
  };

  searchInput.onkeyup = (e) => e.key === "Enter" && search(searchInput.value);
  searchInput.oninput = () => resetInputButton.classList.toggle("hidden", !searchInput.value);
  resetInputButton.onclick = () => {
    searchInput.value = "";
    resetInputButton.classList.add("hidden");
  };
}

// ======================================================
// Render Other Contents
// ======================================================
async function renderOtherContents(menu) {
  $("#blog-posts").style.display = "none";
  const postContainer = $("#contents");
  postContainer.style.display = "block";

  if (typeof menu === "string") {
    menu = { download_url: "/menu/" + menu, name: menu.split("/").pop() };
  }

  let menuDownloadUrl = menu.download_url;
  if (!isLocal && localDataUsing) {
    menuDownloadUrl = `${window.location.origin}/${siteConfig.repositoryName}${menu.download_url}`;
  }

  try {
    const response = await fetch(menuDownloadUrl);
    const text = await response.text();
    styleMarkdown("menu", text, undefined);
    updateURL({ menu: menu.name });
  } catch {
    styleMarkdown("menu", "# Error입니다. 파일명을 확인해주세요.");
  }
}

// ======================================================
// Initialize
// ======================================================
async function initialize() {
  await initDataBlogMenu();
  await renderMenu();

  const searchParams = new URLSearchParams(window.location.search);
  const menuParam = searchParams.get("menu");
  const postParam = searchParams.get("post");

  if (postParam) {
    const postInfo = extractFileInfo(decodeURI(postParam).replaceAll("+", " "));
    renderPost(postInfo);
  } else if (menuParam === "blog.md" || !menuParam) {
    await initDataBlogList();
    renderBlogList();
    renderBlogCategory();
    if (!menuParam) updateURL({ menu: "blog.md" });
  } else if (menuParam) {
    renderOtherContents(menuParam);
  }
}

// ======================================================
// Start
// ======================================================
initialize();
